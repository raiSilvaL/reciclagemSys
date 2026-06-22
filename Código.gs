/** @OnlyCurrentDoc */

const CONFIG = {
  SPREADSHEET_ID: '16t9BuRK8af7RyvhwdzD_EpGrNDkGIc3VG2082xjrS5s',
  ABA_RESPOSTAS: 'Respostas',
  ABA_USUARIOS: 'UsuarioPreencher',
  ABA_OPERADORES: 'Operadores',
  ABA_FOLGAS: 'Folgas',
  ABA_HSE: 'hse',
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
  DEVOLUTIVA_RESPONSAVEL: 29,
  OBS: 30,
  GRAVIDADE_NIVEL: 33
};

const CORES_NIVEL = { grave: '#ff0000', moderado: '#ff9900', leve: '#0000ff' };
const NIVEL_COR = { '#ff0000': 'grave', '#ff9900': 'moderado', '#0000ff': 'leve' };

function doGet(e) {
  const view = e.parameter.view || 'formulario';
  if (view === 'gestaorec') {
    return HtmlService.createTemplateFromFile('GestaoRec')
      .evaluate()
      .setTitle('Painel de Reciclagem - Luft Logistics')
      .setFaviconUrl('https://files.manuscdn.com/user_upload_by_module/session_file/310519663542928912/JqFegPkRcQqzqCZX.png')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else {
    return HtmlService.createTemplateFromFile('Formulario')
      .evaluate()
      .setTitle('Formulário de Reciclagem - Luft Logistics')
      .setFaviconUrl('https://files.manuscdn.com/user_upload_by_module/session_file/310519663542928912/JqFegPkRcQqzqCZX.png')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function getNivelByColor(hexColor) {
  if (!hexColor || hexColor === '#ffffff' || hexColor === 'white') return 'outros';
  const c = hexColor.toLowerCase().replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Azul: b dominante (leve)
  if (b > 150 && b > r * 1.5 && b > g * 1.5) return 'leve';
  // Laranja: r alto, g medio, b baixo (moderado)
  if (r > 200 && g > 100 && g < 200 && b < 80) return 'moderado';
  // Vermelho: r alto, g baixo, b baixo (grave)
  if (r > 180 && g < 80 && b < 80) return 'grave';
  return 'outros';
}

function getInitialData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
    const data = { usuarios: [], maquinas: [], categorias: [], tiposRetorno: [] };
    if (sheetUser) {
      const lastRow = sheetUser.getLastRow();
      const values = sheetUser.getDataRange().getValues();
      const colCRange = sheetUser.getRange(2, 3, lastRow - 1, 1);
      const backgrounds = colCRange.getBackgrounds();
      const seen = new Set();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0]) data.usuarios.push(values[i][0]);
        if (values[i][1]) data.maquinas.push(values[i][1]);
        if (values[i][2] && !seen.has(values[i][2])) {
          seen.add(values[i][2]);
          const cor = backgrounds[i - 1][0] || '#ffffff';
          data.categorias.push({ nome: values[i][2], nivel: getNivelByColor(cor), cor: cor });
        }
        if (values[i][3]) data.tiposRetorno.push(values[i][3]);
      }
      data.usuarios = [...new Set(data.usuarios)];
      data.maquinas = [...new Set(data.maquinas)];
      data.tiposRetorno = [...new Set(data.tiposRetorno)];
    }
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

function getHseData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_HSE);
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
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

function updateRelease(row, identificadorLiberador) {
  try {
    if (!identificadorLiberador) {
      return { success: false, message: 'Identificação do superior é obrigatória.' };
    }
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    const dataLiberacao = Utilities.formatDate(new Date(), 'GMT-3', 'dd/MM/yyyy HH:mm:ss');
    sheet.getRange(row, 19).setValue('Sim');
    sheet.getRange(row, 26).setValue('Pendente');
    sheet.getRange(row, 31).setValue(identificadorLiberador);
    sheet.getRange(row, 32).setValue(dataLiberacao);
    return { success: true, message: 'Reciclagem liberada com sucesso!' };
  } catch (e) { return { success: false, message: 'Erro: ' + e.toString() }; }
}

function getReleaseHistory() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const lastCol = Math.max(sheet.getLastColumn(), 32);
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const history = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const liberado = String(row[18]).trim();
      const emailLiberador = row[30];
      if (liberado === "Sim" && emailLiberador) {
        let dataOriginalStr = "";
        try {
          if (row[0] instanceof Date) {
            dataOriginalStr = Utilities.formatDate(row[0], "GMT-3", "dd/MM/yyyy HH:mm");
          } else if (row[0]) {
            dataOriginalStr = String(row[0]);
          }
        } catch(err) { dataOriginalStr = "Data N/A"; }
        let dataLibStr = "";
        try {
          if (row[31] instanceof Date) {
            dataLibStr = Utilities.formatDate(row[31], "GMT-3", "dd/MM/yyyy HH:mm:ss");
          } else {
            dataLibStr = String(row[31] || "N/A");
          }
        } catch(err) { dataLibStr = String(row[31] || "N/A"); }
        history.push({
          nome: row[4] || "N/A",
          liberador: emailLiberador,
          dataHora: dataLibStr,
          dataOriginal: dataOriginalStr
        });
        if (history.length >= 50) break;
      }
    }
    return history;
  } catch (e) {
    Logger.log("Erro no Histórico: " + e.toString());
    return [];
  }
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
    var metadadosJson = JSON.stringify({ name: nomeArquivo, parents: [CONFIG.PASTA_IMAGENS_ID] });
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

function processForm(form) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.ABA_RESPOSTAS);
      const header = ['Carimbo', 'E-mail', 'Quem preencheu', 'Tipo', 'Nome', 'CPF', 'Setor', 'Turno', 'Depto', 'Login', 'Data Ocorrido', 'Máquina', 'Categoria', 'Local', 'Descrição', 'Investigação', 'Carteirinha', 'AXYMA', 'Liberado', 'Motivo', 'Obs', 'Devolutiva', 'Foto', 'Tipo Retorno', 'Observação', 'Status', 'Data Agendamento', 'Responsável', 'HSE', 'Observação Agendamento', 'E-mail Liberador', 'Data Liberação', '', 'Gravidade Nível'];
      sheet.appendRow(header);
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
    if (form.tipoSolicitacao === 'Desvio de HSE') {
      const newRow = sheet.getLastRow();
      let corParaSalvar = '';
      if (form.categoria && form.categoria !== 'Outros') {
        const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
        if (sheetUser) {
          const lastRowUser = sheetUser.getLastRow();
          const catValues = sheetUser.getRange(2, 3, lastRowUser - 1, 1).getValues();
          const catBgs = sheetUser.getRange(2, 3, lastRowUser - 1, 1).getBackgrounds();
          for (let i = 0; i < catValues.length; i++) {
            if (String(catValues[i][0]).trim() === String(form.categoria).trim()) {
              const cor = catBgs[i][0] || '';
              if (cor && cor !== '#ffffff' && cor !== 'white') corParaSalvar = cor;
              break;
            }
          }
        }
      } else if (form.categoriaCor) {
        corParaSalvar = form.categoriaCor;
      }
      if (corParaSalvar) {
        sheet.getRange(newRow, 13).setBackground(corParaSalvar);
        const nivelTexto = getNivelByColor(corParaSalvar);
        if (nivelTexto && nivelTexto !== 'outros') sheet.getRange(newRow, COLS.GRAVIDADE_NIVEL).setValue(nivelTexto);
      }
    }
    enviarEmailNotificacao(form, urlImagem);
    return { success: true, message: "Sucesso! Formulário enviado." };
  } catch (e) {
    return { success: false, message: "Erro crítico no servidor: " + e.toString() };
  }
}

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
    const sheetOp = ss.getSheetByName(CONFIG.ABA_OPERADORES);
    if (!sheetOp) { Logger.log('Aba Operadores não encontrada'); return; }

    const values = sheetOp.getDataRange().getValues();
    const cpfAssociado = String(dados.cpf || '').replace(/\D/g, '').padStart(11, '0');
    let emailSuperior = '';

    Logger.log('CPF buscado (normalizado): ' + cpfAssociado);
    Logger.log('Total de linhas na aba Operadores: ' + (values.length - 1));

    for (let i = 1; i < values.length; i++) {
      const cpfLinha = String(values[i][2] || '').replace(/\D/g, '').padStart(11, '0');
      if (i <= 5) Logger.log('Linha ' + (i+1) + ' CPF: [' + cpfLinha + '] Email BG: [' + String(values[i][58] || '') + ']'); //Alterar index para 57 para enviar para os coordenadores
      if (cpfLinha === cpfAssociado) {
        emailSuperior = String(values[i][58] || '').trim(); //Alterar index para 57 para enviar para os coordenadores
        Logger.log('Match encontrado na linha ' + (i+1) + ' - Email: ' + emailSuperior);
        break;
      }
    }

    if (!emailSuperior) {
      Logger.log('E-mail do superior não encontrado para CPF: ' + cpfAssociado);
      return;
    }

    let assunto = '';
    let corpoEmail = '';
    if (dados.tipoSolicitacao === 'Desvio de HSE') {
      assunto = `ALERTA DE DESVIO DE HSE - ${dados.nome} - ${dados.dataOcorrido}`;
      corpoEmail = gerarCorpoEmailDesvioHSE(dados, urlImagem);
    } else if (dados.tipoSolicitacao === 'Retorno as atividade') {
      assunto = `RETORNO ÀS ATIVIDADES - ${dados.nome}`;
      corpoEmail = gerarCorpoEmailRetornoAtividades(dados);
    }

    if (assunto && corpoEmail) {
      MailApp.sendEmail({
        to: emailSuperior,
        subject: assunto,
        htmlBody: corpoEmail,
        name: CONFIG.NOME_SISTEMA
      });
    }
  } catch (e) {
    Logger.log('Erro ao enviar e-mail: ' + e.toString());
  }
}

function getDetailedRecords(filter = 'TUDO') {
  try {
    Logger.log('getDetailedRecords chamado com filter=' + filter);
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) { Logger.log('Aba Respostas nao encontrada'); return []; }
    const lastRow = sheet.getLastRow();
    Logger.log('lastRow=' + lastRow);
    if (lastRow < 2) return [];
    const sheetLastCol = sheet.getLastColumn();
    const data = sheet.getRange(1, 1, lastRow, sheetLastCol).getValues();
    const records = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nivelTexto = (sheetLastCol >= COLS.GRAVIDADE_NIVEL && row[COLS.GRAVIDADE_NIVEL - 1]) ? String(row[COLS.GRAVIDADE_NIVEL - 1]).toLowerCase() : '';
      const categoriaCor = CORES_NIVEL[nivelTexto] || '';
      const record = {
        rowId: i + 1,
        carimbo: row[0] ? Utilities.formatDate(new Date(row[0]), "GMT-3", "dd/MM/yyyy HH:mm") : 'N/A',
        email: row[1] || 'N/A',
        quemPreencheu: row[2] || 'N/A',
        tipoSolicitacao: row[3] || 'N/A',
        nome: row[4] || 'N/A',
        cpf: row[5] ? String(row[5]) : 'N/A',
        setor: row[6] || 'N/A',
        turno: row[7] || 'N/A',
        depto: row[8] || 'N/A',
        login: row[9] || 'N/A',
        dataOcorrido: row[10] ? Utilities.formatDate(new Date(row[10]), "GMT-3", "dd/MM/yyyy HH:mm") : 'N/A',
        maquina: row[11] || 'N/A',
        categoria: row[12] || 'N/A',
        categoriaCor: (categoriaCor && categoriaCor !== '#ffffff' && categoriaCor !== 'white') ? categoriaCor : '',
        local: row[13] || 'N/A',
        descricao: row[14] || 'N/A',
        investigacaoLP: row[15] || 'N/A',
        carteirinhaRetirada: row[16] || 'N/A',
        axyma: row[17] || 'N/A',
        liberado: row[18] || 'N/A',
        motivoNaoLiberacao: row[19] || 'N/A',
        obsNaoLiberacao: row[20] || 'N/A',
        previsaoRetorno: row[21] ? Utilities.formatDate(new Date(row[21]), "GMT-3", "dd/MM/yyyy") : 'N/A',
        urlImagem: row[22] || 'N/A',
        tipoRetorno: row[23] || 'N/A',
        observacao: row[24] || 'N/A',
        status: row[25] || 'N/A',
        dataAgendada: row[26] ? (row[26] instanceof Date ? Utilities.formatDate(row[26], 'GMT-3', 'dd/MM/yyyy HH:mm') : String(row[26])) : null,
        responsavel: row[27] || 'N/A',
        hse: row[28] || 'N/A',
        observacaoAgendamento: row[29] || 'N/A',
        emailLiberador: row[30] || 'N/A',
        dataLiberacao: row[31] ? Utilities.formatDate(new Date(row[31]), "GMT-3", "dd/MM/yyyy HH:mm:ss") : 'N/A',
        devolutivaResponsavel: row[28] || 'N/A'
      };
      // dataAgendada agora é texto: "dd/MM/yyyy HH:mm" ou "dd/MM/yyyy HH:mm até dd/MM/yyyy HH:mm"
      let dataAgendamentoDate = null;
      if (row[26]) {
        const strData = String(row[26]);
        // Pega somente a data de início (antes de " até " se houver)
        const parteInicio = strData.split(' até ')[0].trim();
        const partes = parteInicio.split(' ');
        if (partes.length >= 2) {
          const dp = partes[0].split('/');
          const hp = partes[1].split(':');
          if (dp.length === 3 && hp.length >= 2) {
            dataAgendamentoDate = new Date(parseInt(dp[2]), parseInt(dp[1]) - 1, parseInt(dp[0]), parseInt(hp[0]), parseInt(hp[1]));
          }
        } else if (row[26] instanceof Date) {
          dataAgendamentoDate = new Date(row[26]);
        }
      }
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (record.status === "Reciclagem não liberada") {
        const dataOcorridoDate = row[10] ? new Date(row[10]) : null;
        if (dataOcorridoDate) {
          const diffTime = Math.abs(hoje.getTime() - dataOcorridoDate.getTime());
          record.diasPendentes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          record.diasPendentes = 0;
        }
      } else if (record.status === "Pendente" && !dataAgendamentoDate) {
        const dataCarimboDate = row[0] ? new Date(row[0]) : null;
        if (dataCarimboDate) {
          const diffTime = Math.abs(hoje.getTime() - dataCarimboDate.getTime());
          record.diasPendentes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          record.diasPendentes = 0;
        }
      }
      if (filter === 'TUDO') {
        records.push(record);
      } else if (filter === 'NAO_LIBERADA' && record.status === "Reciclagem não liberada") {
        records.push(record);
      } else if (filter === 'PENDENTE' && record.status === "Pendente" && !record.dataAgendada) {
        records.push(record);
      } else if (filter === 'AGENDADA' && record.status === "Agendado" && dataAgendamentoDate && dataAgendamentoDate > hoje) {
        records.push(record);
      } else if (filter === 'AGUARDANDO' && record.status === "Agendado" && dataAgendamentoDate && dataAgendamentoDate <= hoje) {
        records.push(record);
      } else if (filter === 'CONCLUIDA' && (record.status === "Concluído" || record.status === "Finalizado reprovado")) {
        records.push(record);
      }
    }
    Logger.log('getDetailedRecords retornando ' + records.length + ' registros');
    return JSON.stringify(records);
  } catch (e) {
    Logger.log('Erro em getDetailedRecords: ' + e.toString());
    return JSON.stringify([]);
  }
}

function getResponsavelEmails() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
    const responsaveis = [];
    if (sheetUser) {
      const values = sheetUser.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][5]) responsaveis.push(values[i][5]);
      }
    }
    return { responsaveis };
  } catch (e) {
    return { responsaveis: [] };
  }
}

function getUsuarioPreencherData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetUser = ss.getSheetByName(CONFIG.ABA_USUARIOS);
    const responsaveis = [];
    if (sheetUser) {
      const values = sheetUser.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (values[i][0]) responsaveis.push(values[i][0]);
      }
    }
    return { responsaveis: [...new Set(responsaveis)] };
  } catch (e) {
    return { responsaveis: [] };
  }
}

function formatarDataHoraISO(dtStr) {
  if (!dtStr) return "";
  const parts = dtStr.split('T');
  const dateParts = parts[0].split('-');
  const timePart = parts[1] || "00:00";
  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${timePart}`;
}

function gerarCorpoEmailAgendamento(colaborador, agendamento) {
  const styles = {
    container: "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 20px;",
    card: "background-color: #ffffff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; border: 1px solid #ddd;",
    header: "background-color: #003366; color: #ffffff; padding: 20px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 1px;",
    body: "padding: 30px;",
    title: "font-size: 18px; color: #333; margin-bottom: 20px; border-bottom: 2px solid #003366; padding-bottom: 10px;",
    row: "margin-bottom: 15px; font-size: 15px; color: #555;",
    label: "font-weight: bold; color: #333; width: 160px; display: inline-block;",
    footer: "background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;"
  };
  const addRow = (label, value) => value ? `<div style="${styles.row}"><span style="${styles.label}">${label}:</span> ${value}</div>` : '';
  let html = `<div style="${styles.container}"><div style="${styles.card}">`;
  html += `<div style="${styles.header}">✅ RECICLAGEM AGENDADA</div>`;
  html += `<div style="${styles.body}">`;
  html += `<div style="${styles.title}">Dados do Colaborador</div>`;
  html += addRow('Nome', colaborador.nome);
  html += addRow('Login', colaborador.login);
  html += addRow('CPF', colaborador.cpf);
  html += addRow('Setor', colaborador.setor);
  html += addRow('Turno', colaborador.turno);
  html += addRow('Departamento', colaborador.depto);
  html += `<div style="${styles.title}; margin-top:20px;">Dados da Reciclagem</div>`;
  html += addRow('Data / Hora', agendamento.dataInicio);
  if (agendamento.dataFim) html += addRow('Data Fim', agendamento.dataFim);
  html += addRow('Responsável', agendamento.responsavel);
  if (agendamento.observacao) html += addRow('Observação', agendamento.observacao);
  html += `</div>`;
  html += `<div style="${styles.footer}">Enviado automaticamente por ${CONFIG.NOME_SISTEMA}</div>`;
  html += `</div></div>`;
  return html;
}

function agendarReciclagem(rowId, dataInicio, dataFim, responsavel, observacao) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) return { success: false, message: 'Aba de Respostas não encontrada.' };

    const dataAgendamentoFormatada = Utilities.formatDate(new Date(dataInicio), 'GMT-3', 'dd/MM/yyyy HH:mm');
    const dataFimFormatada = dataFim ? Utilities.formatDate(new Date(dataFim), 'GMT-3', 'dd/MM/yyyy HH:mm') : '';
    const periodoSalvo = dataFimFormatada
      ? dataAgendamentoFormatada + ' até ' + dataFimFormatada
      : dataAgendamentoFormatada;

    sheet.getRange(rowId, COLS.DATA_AGENDAMENTO).setValue(periodoSalvo);
    sheet.getRange(rowId, COLS.RESPONSAVEL).setValue(responsavel);
    sheet.getRange(rowId, COLS.OBS).setValue(observacao);
    sheet.getRange(rowId, COLS.STATUS).setValue('Agendado');

    try {
      const rowData = sheet.getRange(rowId, 1, 1, 10).getValues()[0];
      const colaborador = {
        nome:  rowData[4] || '',
        cpf:   String(rowData[5] || ''),
        setor: rowData[6] || '',
        turno: rowData[7] || '',
        depto: rowData[8] || '',
        login: rowData[9] || ''
      };

      const sheetOp = ss.getSheetByName(CONFIG.ABA_OPERADORES);
      if (sheetOp && colaborador.cpf) {
        const opValues = sheetOp.getDataRange().getValues();
        const cpfBusca = colaborador.cpf.replace(/\D/g, '').padStart(11, '0');
        for (let i = 1; i < opValues.length; i++) {
          const cpfLinha = String(opValues[i][2] || '').replace(/\D/g, '').padStart(11, '0');
          if (cpfLinha === cpfBusca) {
            const emailSuperior = String(opValues[i][58] || '').trim(); //Alterar index para 57 para enviar para os coordenadores
            if (emailSuperior) {
              const corpoEmail = gerarCorpoEmailAgendamento(colaborador, {
                dataInicio: dataAgendamentoFormatada,
                dataFim: dataFimFormatada,
                responsavel: responsavel,
                observacao: observacao
              });
              MailApp.sendEmail({
                to: emailSuperior,
                subject: `RECICLAGEM AGENDADA - ${colaborador.nome} - ${dataAgendamentoFormatada}`,
                htmlBody: corpoEmail,
                name: CONFIG.NOME_SISTEMA
              });
            }
            break;
          }
        }
      }
    } catch (emailErr) {
      Logger.log('Erro ao enviar e-mail de agendamento: ' + emailErr.toString());
    }

    return { success: true, message: 'Reciclagem agendada com sucesso!' };
  } catch (e) {
    Logger.log('Erro ao agendar reciclagem: ' + e.toString());
    return { success: false, message: 'Erro ao agendar reciclagem: ' + e.toString() };
  }
}

function processarResultadoReciclagemComResp(rowId, aprovado, responsavelDevolutiva) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet) return { success: false, message: 'Aba de Respostas não encontrada.' };

    const statusFinal = aprovado ? 'Concluído' : 'Finalizado reprovado';
    sheet.getRange(rowId, COLS.STATUS).setValue(statusFinal);
    sheet.getRange(rowId, COLS.DEVOLUTIVA_RESPONSAVEL).setValue(responsavelDevolutiva);

    if (!aprovado) {
      const lastCol = sheet.getLastColumn();
      const rowData = sheet.getRange(rowId, 1, 1, Math.max(lastCol, 26)).getValues()[0];
      const nivelAtual = String(sheet.getRange(rowId, COLS.GRAVIDADE_NIVEL).getValue() || '').toLowerCase();
      Logger.log('Nível atual (col 33, rowId ' + rowId + '): [' + nivelAtual + ']');
      let novoNivel;
      if (nivelAtual === 'leve') novoNivel = 'moderado';
      else novoNivel = 'grave';
      const novaCor = CORES_NIVEL[novoNivel];
      Logger.log('Novo nível: ' + novoNivel + ' -> nova cor: ' + novaCor);

      const novaLinha = [
        new Date(),
        rowData[1] || '',
        rowData[2] || '',
        rowData[3] || '',
        rowData[4] || '',
        rowData[5] || '',
        rowData[6] || '',
        rowData[7] || '',
        rowData[8] || '',
        rowData[9] || '',
        rowData[10] || '',
        rowData[11] || '',
        rowData[12] || '',
        rowData[13] || '',
        rowData[14] || '',
        rowData[15] || '',
        rowData[16] || '',
        rowData[17] || '',
        rowData[18] || '',
        rowData[19] || '',
        rowData[20] || '',
        rowData[21] || '',
        rowData[22] || '',
        rowData[23] || '',
        rowData[24] || '',
        'Pendente'
      ];
      sheet.appendRow(novaLinha);
      const newRow = sheet.getLastRow();
      sheet.getRange(newRow, 13).setBackground(novaCor);
      sheet.getRange(newRow, COLS.GRAVIDADE_NIVEL).setValue(novoNivel);
      Logger.log('Nova linha criada na linha ' + newRow + ' com cor ' + novaCor + ' e nível ' + novoNivel);
    }

    return { success: true, message: 'Resultado da reciclagem processado com sucesso!' };
  } catch (e) {
    Logger.log('Erro ao processar resultado da reciclagem: ' + e.toString());
    return { success: false, message: 'Erro ao processar resultado da reciclagem: ' + e.toString() };
  }
}

function processarUploadFolgas(fileContent, fileName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.ABA_FOLGAS);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.ABA_FOLGAS);
    }

    let data = [];
    let uploadedHeaders = [];
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (fileExtension === 'xlsx') {
      try {
        const decodedBytes = Utilities.base64Decode(fileContent);
        const blob = Utilities.newBlob(
          decodedBytes,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName
        );
        const tempFile = DriveApp.createFile(blob);
        const tempFileId = tempFile.getId();
        const resource = { title: 'temp_folgas_import', mimeType: MimeType.GOOGLE_SHEETS };
        const convertedFile = Drive.Files.copy(resource, tempFileId);
        const xlsxSs = SpreadsheetApp.openById(convertedFile.id);
        const xlsxSheet = xlsxSs.getSheets()[0];
        const xlsxData = xlsxSheet.getDataRange().getValues();
        uploadedHeaders = xlsxData[0].map(h => String(h).trim());
        data = xlsxData.slice(1);
        DriveApp.getFileById(tempFileId).setTrashed(true);
        DriveApp.getFileById(convertedFile.id).setTrashed(true);
      } catch (xlsxErr) {
        Logger.log('Erro ao processar .xlsx: ' + xlsxErr.toString());
        return {
          success: false,
          message: 'Erro ao processar o arquivo .xlsx: ' + xlsxErr.message +
                   '. Certifique-se de que a Drive API está habilitada em Services no editor do Apps Script.'
        };
      }

    } else if (fileExtension === 'csv') {
      let cleanContent = fileContent.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
      const firstLine = cleanContent.split('\n')[0];
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      let csvData;
      if (semicolonCount > commaCount) {
        csvData = Utilities.parseCsv(convertSemicolonToComma(cleanContent));
      } else {
        csvData = Utilities.parseCsv(cleanContent);
      }
      uploadedHeaders = csvData[0].map(h => String(h).trim());
      data = csvData.slice(1);

    } else {
      return { success: false, message: 'Formato de arquivo não suportado. Por favor, use .csv ou .xlsx.' };
    }

    const expectedHeaders = [
      'Operacao', 'NivelOrganizacional', 'Grupo', 'DepartamentoEscala',
      'Profissional', 'DataAdmissao', 'CPF', 'Data', 'DescricaoHorario', 'Evento'
    ];
    const normalize = str => String(str).toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
    const normalizedExpected = expectedHeaders.map(normalize);
    const normalizedUploaded = uploadedHeaders.map(normalize);
    const missingHeaders = expectedHeaders.filter((h, i) => !normalizedUploaded.includes(normalizedExpected[i]));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: 'O arquivo não contém todas as colunas obrigatórias. ' +
                 'Colunas faltando: ' + missingHeaders.join(', ') + '. ' +
                 'Colunas encontradas no arquivo: ' + uploadedHeaders.join(', ')
      };
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(uploadedHeaders);
    }
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    if (data.length > 0) {
      const nonEmptyData = data.filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));
      if (nonEmptyData.length > 0) {
        sheet.getRange(2, 1, nonEmptyData.length, nonEmptyData[0].length).setValues(nonEmptyData);
      }
    }

    return {
      success: true,
      message: 'Dados de folgas importados com sucesso! ' + data.length + ' registros importados do arquivo ' + fileName + '.'
    };
  } catch (e) {
    Logger.log('Erro ao processar upload de folgas: ' + e.toString());
    return { success: false, message: 'Erro ao processar upload de folgas: ' + e.toString() };
  }
}

function convertSemicolonToComma(csvText) {
  const lines = csvText.split('\n');
  return lines.map(line => {
    let result = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        result += char;
      } else if (char === ';' && !inQuotes) {
        result += ',';
      } else {
        result += char;
      }
    }
    return result;
  }).join('\n');
}

function getFolgasData() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_FOLGAS);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getDataRange().getValues();
    const folgas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cpf = String(row[6]).trim();
      const dataFolga = row[7];
      if (cpf && dataFolga instanceof Date) {
        folgas.push({
          cpf: cpf,
          data: Utilities.formatDate(dataFolga, "GMT-3", "yyyy-MM-dd")
        });
      }
    }
    return folgas;
  } catch (e) {
    Logger.log("Erro ao obter dados de folgas: " + e.toString());
    return [];
  }
}

function getOperadoresComCPF() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetBd = ss.getSheetByName(CONFIG.ABA_OPERADORES);
    if (!sheetBd) return [];
    const values = sheetBd.getDataRange().getValues();
    return values.slice(1).map(row => ({
      nome: row[0], cpf: String(row[2]).trim()
    })).filter(emp => emp.cpf);
  } catch (e) { return []; }
}

function getReciclagensAgendadas() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_RESPOSTAS);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getDataRange().getValues();
    const agendamentos = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[COLS.STATUS - 1];
      const dataAgendamento = row[COLS.DATA_AGENDAMENTO - 1];
      const nome = row[4];
      const cpf = String(row[5]).trim();
      if (status === "Agendado" && dataAgendamento) {
        let startISO = null;
        if (dataAgendamento instanceof Date) {
          startISO = Utilities.formatDate(dataAgendamento, "GMT-3", "yyyy-MM-dd'T'HH:mm:ss");
        } else {
          // Novo formato texto: "dd/MM/yyyy HH:mm" ou "dd/MM/yyyy HH:mm até ..."
          const strData = String(dataAgendamento);
          const parteInicio = strData.split(' até ')[0].trim();
          const match = parteInicio.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
          if (match) {
            startISO = match[3] + '-' + match[2] + '-' + match[1] + 'T' + (match[4] || '00') + ':' + (match[5] || '00') + ':00';
          }
        }
        if (startISO) {
          agendamentos.push({
            title: `Reciclagem: ${nome}`,
            start: startISO,
            cpf: cpf,
            color: '#0072bc'
          });
        }
      }
    }
    return agendamentos;
  } catch (e) {
    Logger.log("Erro ao obter reciclagens agendadas: " + e.toString());
    return [];
  }
}

function getCalendarEvents() {
  const agendamentos = getReciclagensAgendadas();
  return agendamentos;
}

function getFolgasPorCpf(cpf) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABA_FOLGAS);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getDataRange().getValues();
    const datas = [];
    const cpfBusca = String(cpf).trim();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cpfRow = String(row[6]).trim();
      const dataFolga = row[7];
      if (cpfRow === cpfBusca && dataFolga instanceof Date) {
        datas.push(Utilities.formatDate(dataFolga, 'GMT-3', 'yyyy-MM-dd'));
      }
    }
    return datas;
  } catch (e) {
    Logger.log('Erro em getFolgasPorCpf: ' + e.toString());
    return [];
  }
}
