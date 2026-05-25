/** @OnlyCurrentDoc */

// Força a identificação dos escopos necessários no painel do Google
// DriveApp.getStorageUsed();
// MailApp.getRemainingDailyQuota();

// ============================================
// CONFIGURAÇÕES COMPARTILHADAS
// ============================================

const CONFIG = {
  SPREADSHEET_ID: '16t9BuRK8af7RyvhwdzD_EpGrNDkGIc3VG2082xjrS5s',
  ABA_RESPOSTAS: 'Respostas',
  ABA_USUARIOS: 'UsuarioPreencher',
  ABA_OPERADORES: 'Operadores',
  PASTA_IMAGENS_ID: '1S47wFDvFuHxXg9efpLe-Nq9hc3b9FkON',
  NOME_SISTEMA: 'Sistema de Reciclagem - Luft Logistics'
};

const CONFIG_DASH = {
  SPREADSHEET_ID: '16t9BuRK8af7RyvhwdzD_EpGrNDkGIc3VG2082xjrS5s',
  ABA_RESPOSTAS: 'Respostas',
  ABA_USUARIOS: 'UsuarioPreencher'
};

const COLS = {
  STATUS: 26,
  DATA_AGENDAMENTO: 27,
  RESPONSAVEL: 28,
  HSE: 29,
  OBS: 30
};

// ============================================
// FUNÇÕES PRINCIPAIS - ROTEAMENTO
// ============================================

function doGet(e) {
  // Se não houver parâmetro, retorna Formulário por padrão
  const view = e.parameter.view || 'formulario';
  
  if (view === 'gestaorec') {
    return HtmlService.createTemplateFromFile('GestaoRec')
      .evaluate()
      .setTitle('Painel de Reciclagem - Luft Logistics')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else {
    return HtmlService.createTemplateFromFile('Formulario')
      .evaluate()
      .setTitle('Formulário de Reciclagem - Luft Logistics')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ============================================
// FUNÇÕES DO FORMULÁRIO
// ============================================

function getInitialData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
    const data = { usuarios: [], maquinas: [], categorias: [], tiposRetorno: [] };
    if (sheetUser) {
      const values = sheetUser.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0]) data.usuarios.push(values[i][0]);
        if (values[i][1]) data.maquinas.push(values[i][1]);
        if (values[i][2]) data.categorias.push(values[i][2]); 
        if (values[i][3]) data.tiposRetorno.push(values[i][3]); 
      }
    }
    Object.keys(data).forEach(key => data[key] = [...new Set(data[key])]);
    return data;
  } catch (e) { return { usuarios: [], maquinas: [], categorias: [], tiposRetorno: [] }; }
}

function searchEmployees() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetBd = ss.getSheetByName(CONFIG.ABA_OPERADORES);
    if (!sheetBd) return [];
    const values = sheetBd.getDataRange().getValues();
    return values.slice(1).map(row => ({
      nome: row[0], cpf: row[2], setor: row[8], turno: row[10], depto: row[1], login: row[43]
    })).filter(emp => emp.nome || emp.login);
  } catch (e) { return []; }
}

function getPendingReleases() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const pending = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][18] === "Não") {
        pending.push({
          row: i + 1,
          nome: data[i][4],
          data: Utilities.formatDate(new Date(data[i][0]), "GMT-3", "dd/MM/yyyy HH:mm"),
          motivo: data[i][19]
        });
      }
    }
    return pending;
  } catch (e) { return []; }
}

function updateRelease(row) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    sheet.getRange(row, 19).setValue("Sim");
    sheet.getRange(row, 26).setValue("Pendente");
    return { success: true, message: "Reciclagem liberada com sucesso!" };
  } catch (e) { return { success: false, message: "Erro: " + e.toString() }; }
}

function salvarImagemNoDrive(base64Data) {
  try {
    var blocoSplit = base64Data.split(",");
    var formato = "image/jpeg";
    var imagemPuraBase64 = base64Data;
    
    if (blocoSplit.length > 1) {
      imagemPuraBase64 = blocoSplit[1];
      var match = blocoSplit[0].match(/:(.*?);/);
      if (match) formato = match[1];
    }
    
    var dadosDecodificados = Utilities.base64Decode(imagemPuraBase64);
    var nomeArquivo = "Carteirinha_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") + ".jpg";
    var boundary = "---SeparadorFormularioReciclagem---";
    var delimitadorInicio = "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n";
    var metadadosJson = JSON.stringify({
      name: nomeArquivo,
      parents: [CONFIG.PASTA_IMAGENS_ID]
    });
    
    var delimitadorMeio = "\r\n--" + boundary + "\r\nContent-Type: " + formato + "\r\n\r\n";
    var delimitadorFim = "\r\n--" + boundary + "--\r\n";
    
    var corpoBytes = []
      .concat(Utilities.newBlob(delimitadorInicio + metadadosJson + delimitadorMeio).getBytes())
      .concat(dadosDecodificados)
      .concat(Utilities.newBlob(delimitadorFim).getBytes());
    
    var blobFinal = Utilities.newBlob(corpoBytes, "multipart/related; boundary=" + boundary);
    var url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    var opcoes = {
      method: "post",
      contentType: "multipart/related; boundary=" + boundary,
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      payload: blobFinal.getBytes(),
      muteHttpExceptions: true
    };
    
    var resposta = UrlFetchApp.fetch(url, opcoes);
    var resultadoJson = JSON.parse(resposta.getContentText());
    
    if (resultadoJson.id) {
      return "https://drive.google.com/file/d/" + resultadoJson.id + "/view?usp=drivesdk";
    } else {
      throw new Error("Falha na API do Drive: " + resposta.getContentText());
    }
  } catch (erro) {
    Logger.log("Erro crítico ao salvar imagem: " + erro.toString());
    return "Erro ao salvar foto: " + erro.toString();
  }
}

// --- Funções de formatação de e-mail ---

function gerarCorpoEmailDesvioHSE(dados, urlImagem) {
  const styles = {
    container: "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px;",
    card: "background-color: #ffffff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; border: 1px solid #ddd;",
    header: "background-color: #d32f2f; color: #ffffff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 1px;",
    body: "padding: 30px;",
    title: "font-size: 18px; color: #333; margin-bottom: 20px; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;",
    row: "margin-bottom: 15px; font-size: 15px; color: #555;",
    label: "font-weight: bold; color: #333; width: 140px; display: inline-block;",
    footer: "background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;",
    button: "display: inline-block; padding: 12px 25px; background-color: #d32f2f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;"
  };

  let html = `<div style="${styles.container}"><div style="${styles.card}">`;
  html += `<div style="${styles.header}">ALERTA DE DESVIO DE HSE</div>`;
  html += `<div style="${styles.body}">`;
  html += `<div style="${styles.title}">Informações da Ocorrência</div>`;
  
  const addRow = (label, value) => {
    if (value) html += `<div style="${styles.row}"><span style="${styles.label}">${label}:</span> ${value}</div>`;
  };

  addRow('Operador', dados.nome);
  addRow('Login', dados.login);
  addRow('Setor', dados.setor);
  addRow('Data', dados.dataOcorrido);
  addRow('Local', dados.local);
  addRow('Descrição', dados.descricao);
  addRow('Carteirinha Retirada', dados.carteirinhaRetirada);
  addRow('AXYMA', dados.axyma);

  if (urlImagem && !urlImagem.startsWith("Erro") && !urlImagem.startsWith("Sem imagem") && urlImagem !== "") {
    html += `<div style="text-align: center;"><a href="${urlImagem}" style="${styles.button}">VISUALIZAR EVIDÊNCIA</a></div>`;
  }
  
  html += `</div>`;
  html += `<div style="${styles.footer}">Enviado automaticamente por ${CONFIG.NOME_SISTEMA}</div>`;
  html += `</div></div>`;

  return html;
}

function gerarCorpoEmailRetornoAtividades(dados) {
  const styles = {
    container: "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px;",
    card: "background-color: #ffffff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; border: 1px solid #ddd;",
    header: "background-color: #2e7d32; color: #ffffff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 1px;",
    body: "padding: 30px;",
    title: "font-size: 18px; color: #333; margin-bottom: 20px; border-bottom: 2px solid #2e7d32; padding-bottom: 10px;",
    row: "margin-bottom: 15px; font-size: 15px; color: #555;",
    label: "font-weight: bold; color: #333; width: 140px; display: inline-block;",
    footer: "background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;"
  };

  let html = `<div style="${styles.container}"><div style="${styles.card}">`;
  html += `<div style="${styles.header}">RETORNO ÀS ATIVIDADES</div>`;
  html += `<div style="${styles.body}">`;
  html += `<div style="${styles.title}">Informações do Colaborador</div>`;
  
  const addRow = (label, value) => {
    if (value) html += `<div style="${styles.row}"><span style="${styles.label}">${label}:</span> ${value}</div>`;
  };

  addRow('Operador', dados.nome);
  addRow('Login', dados.login);
  addRow('Setor', dados.setor);
  addRow('Tipo Retorno', dados.tipoRetorno);
  addRow('Carteirinha Retirada', dados.carteirinhaRetirada);
  addRow('Observação', dados.observacao);

  html += `</div>`;
  html += `<div style="${styles.footer}">Enviado automaticamente por ${CONFIG.NOME_SISTEMA}</div>`;
  html += `</div></div>`;

  return html;
}

function enviarEmailNotificacao(dados, urlImagem) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
    if (!sheetUser) return;
    const values = sheetUser.getDataRange().getValues();
    const emails = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i][4] && values[i][4].includes("@")) emails.push(values[i][4]);
    }
    if (emails.length === 0) return;

    let assunto = '';
    let corpoHtml = '';

    const tipo = (dados.tipoSolicitacao || "").toLowerCase();

    if (tipo.includes("desvio")) {
      assunto = `⚠ DESVIO DE HSE: ${dados.nome}`;
      corpoHtml = gerarCorpoEmailDesvioHSE(dados, urlImagem);
    } else if (tipo.includes("retorno") || tipo.includes("reciclagem")) {
      assunto = `✅ RETORNO ÀS ATIVIDADES: ${dados.nome}`;
      corpoHtml = gerarCorpoEmailRetornoAtividades(dados);
    } else {
      assunto = `${dados.tipoSolicitacao.toUpperCase()} | ${dados.nome}`;
      corpoHtml = `<p><b>Solicitação:</b> ${dados.tipoSolicitacao}</p><p><b>Colaborador:</b> ${dados.nome}</p>`;
    }

    MailApp.sendEmail({ to: emails.join(","), subject: assunto, name: CONFIG.NOME_SISTEMA, htmlBody: corpoHtml });
  } catch (e) { Logger.log("Erro e-mail: " + e.toString()); }
}

function processForm(form) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.ABA_RESPOSTAS);
      sheet.appendRow(['Carimbo', 'E-mail', 'Quem preencheu', 'Tipo', 'Nome', 'CPF', 'Setor', 'Turno', 'Depto', 'Login', 'Data Ocorrido', 'Máquina', 'Categoria', 'Local', 'Descrição', 'Investigação', 'Carteirinha', 'AXYMA', 'Liberado', 'Motivo', 'Obs', 'Devolutiva', 'Foto', 'Tipo Retorno', 'Observação', 'Status']);
    }

    let urlImagem = "";
    if (form.tipoSolicitacao === "Desvio de HSE" && form.imagem) {
      urlImagem = salvarImagemNoDrive(form.imagem);
    } else if (form.tipoSolicitacao === "Desvio de HSE") {
      urlImagem = "Nenhuma imagem anexada no formulário";
    }

    let status = (form.liberadoReciclagem === "Não") ? "Reciclagem não liberada" : "Pendente";
    const emailUsuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "E-mail indisponível";

    const rowData = [
      new Date(), emailUsuario, form.quemPreencheu, form.tipoSolicitacao,
      form.nome, form.cpf, form.setor, form.turno, form.depto, form.login,
      form.dataOcorrido || '', form.maquina || '', form.categoria || '', form.local || '',
      form.descricao || '', form.investigacaoLP || '', form.carteirinhaRetirada || '', form.axyma || '',
      form.liberadoReciclagem || '', form.motivoNaoLiberacao || '', form.obsNaoLiberacao || '', form.dataDevolutiva || '',
      urlImagem, form.tipoRetorno || '', form.observacao || '', status
    ];

    sheet.appendRow(rowData);
    enviarEmailNotificacao(form, urlImagem);
    return { success: true, message: "Sucesso! Formulário enviado." };
  } catch (e) { 
    return { success: false, message: "Erro crítico no servidor: " + e.toString() }; 
  }
}

function forcarAutorizacaoDrive() {
  var pasta = DriveApp.getFolderById(CONFIG.PASTA_IMAGENS_ID);
  Logger.log("Acesso concedido à pasta: " + pasta.getName());
}

// ============================================
// FUNÇÕES DO PAINEL
// ============================================

function getDetailedRecords(statusFilter) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG_DASH.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_DASH.ABA_RESPOSTAS);
    if (!sheet) throw new Error("Aba não encontrada.");

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    const hoje = new Date();

    return rows.map((row, index) => {
      const carimboData = row[0] ? new Date(row[0]) : null;
      let diasPendentes = 0;
      if (carimboData && !isNaN(carimboData.getTime())) {
        const diffTime = Math.abs(hoje - carimboData);
        diasPendentes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const dataOcorrido = row[10] ? new Date(row[10]) : null;
      
      let dataAgendadaRaw = row[26];
      let dataAgendadaStr = "";
      if (dataAgendadaRaw instanceof Date) {
        dataAgendadaStr = Utilities.formatDate(dataAgendadaRaw, "GMT-3", "dd/MM/yyyy HH:mm");
      } else {
        dataAgendadaStr = String(dataAgendadaRaw || "");
      }

      return {
        rowId: index + 2,
        carimbo: carimboData ? Utilities.formatDate(carimboData, "GMT-3", "dd/MM/yyyy HH:mm") : "",
        nome: String(row[4] || ""),
        setor: String(row[6] || ""),
        turno: String(row[7] || ""),
        depto: String(row[8] || ""),
        dataOcorrido: dataOcorrido ? Utilities.formatDate(dataOcorrido, "GMT-3", "dd/MM/yyyy") : "N/A",
        maquina: String(row[11] || ""),
        liberado: String(row[18] || ""),
        motivoNaoLiberacao: String(row[19] || ""),
        previsaoRetorno: row[21] instanceof Date ? Utilities.formatDate(row[21], "GMT-3", "dd/MM/yyyy") : String(row[21] || ""),
        
        status: String(row[25] || "Pendente"),
        dataAgendada: dataAgendadaStr,
        responsavel: String(row[27] || ""),
        hse: String(row[28] || ""),
        obs: String(row[29] || ""),
        
        diasPendentes: diasPendentes
      };
    }).filter(item => {
      if (statusFilter === 'TUDO') return true;
      const s = item.status;
      if (statusFilter === 'PENDENTE') return s === "Pendente";
      if (statusFilter === 'NAO_LIBERADA') return s === "Reciclagem não liberada";
      if (statusFilter === 'CONCLUIDA') return s === "Concluído" || s === "Finalizado reprovado";
      return false;
    });
  } catch (e) {
    console.error(e.toString());
    return [];
  }
}

function getUsuarioPreencherData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG_DASH.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_DASH.ABA_USUARIOS);
    if (!sheet) return { hse: [], responsaveis: [] };

    const data = sheet.getDataRange().getValues();
    const hse = data.slice(1).map(r => r[0]).filter(v => v !== "");
    const responsaveis = data.slice(1).map(r => r[5]).filter(v => v !== "");

    return { hse, responsaveis };
  } catch (e) {
    return { hse: [], responsaveis: [] };
  }
}

function salvarAgendamentoCompleto(dados) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG_DASH.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_DASH.ABA_RESPOSTAS);
    
    const dataFormatada = dados.duracao === '1' 
      ? formatarDataHoraISO(dados.dataInicio)
      : `${formatarDataHoraISO(dados.dataInicio)} até ${formatarDataHoraISO(dados.dataFim)}`;

    sheet.getRange(dados.rowId, COLS.STATUS).setValue("Agendado");
    sheet.getRange(dados.rowId, COLS.DATA_AGENDAMENTO).setValue(dataFormatada);
    sheet.getRange(dados.rowId, COLS.RESPONSAVEL).setValue(dados.responsavel);
    sheet.getRange(dados.rowId, COLS.HSE).setValue(dados.hse);
    sheet.getRange(dados.rowId, COLS.OBS).setValue(dados.obs);
    
    return { success: true, message: "Agendamento realizado com sucesso!" };
  } catch (e) {
    return { success: false, message: "Erro: " + e.toString() };
  }
}

function processarResultadoReciclagem(rowId, aprovado) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG_DASH.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_DASH.ABA_RESPOSTAS);
    
    if (aprovado) {
      sheet.getRange(rowId, COLS.STATUS).setValue("Concluído");
    } else {
      sheet.getRange(rowId, COLS.STATUS).setValue("Finalizado reprovado");
      
      const lastCol = sheet.getLastColumn();
      const rowData = sheet.getRange(rowId, 1, 1, lastCol).getValues()[0];
      
      // Limpa campos de agendamento na nova linha
      rowData[25] = "Pendente"; // Z
      rowData[26] = ""; // AA
      rowData[27] = ""; // AB
      rowData[28] = ""; // AC
      rowData[29] = ""; // AD
      
      sheet.appendRow(rowData);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function formatarDataHoraISO(dtStr) {
  if (!dtStr) return "";
  // dtStr vem como "YYYY-MM-DDTHH:mm"
  const parts = dtStr.split('T');
  const dateParts = parts[0].split('-');
  const timePart = parts[1] || "00:00";
  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${timePart}`;
}
