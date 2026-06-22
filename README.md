# Riciclagem System

Sistema integrado de gestão de reciclagem de carteiras de operadores de empilhadeira, desenvolvido para a **Luft Logistics**. A solução automatiza o ciclo completo — desde o registro de desvios de segurança e retornos às atividades até o agendamento, acompanhamento e conclusão dos treinamentos de reciclagem, incluindo escalada automática de gravidade em caso de reprovação.

---

## Visão Geral

O sistema expõe duas interfaces distintas em um único Web App, roteadas via parâmetro de URL:

| Parâmetro | Interface | Perfil |
|---|---|---|
| `?view=formulario` (padrão) | Formulário de Registro | Time de HSE |
| `?view=gestaorec` | Painel de Gestão | Time de Treinamento |

A separação garante que cada time acesse apenas as funcionalidades pertinentes à sua responsabilidade dentro do processo.

---

## Funcionalidades

### Formulário de Registro (`Formulario.html`)

Interface mobile-first utilizada pelo Time de HSE. O menu principal oferece quatro opções:

**Novo Registro** — abertura de ocorrências com dois tipos de solicitação:

- **Desvio de HSE:** registra a data e hora do ocorrido, tipo de máquina, categoria do desvio com indicação de gravidade (grave, moderado ou leve), local no formato de posição, descrição detalhada, resposta sobre investigação de Loss Prevention, AXYMA aplicado, retirada de carteirinha, liberação imediata para reciclagem e captura fotográfica da carteirinha via câmera do dispositivo. A foto é redimensionada no cliente (máx. 1024px) antes do upload para o Google Drive.
- **Retorno às Atividades:** registra o tipo de retorno (com campo livre para especificação) e observações.

Em ambos os casos, o preenchimento do funcionário é automatizado: ao digitar o nome, o sistema busca na base de operadores e preenche automaticamente login, CPF, departamento, setor e turno.

**Liberar Reciclagem** — lista operadores com status "Reciclagem não liberada" e permite que um superior do time de HSE, identificado por CPF com autocomplete na base HSE, autorize o início da reciclagem. A liberação registra o identificador do superior e o carimbo de data/hora.

**Resultado do NOBA** — lista reciclagens agendadas com data já vencida. Permite registrar aprovação ou reprovação mediante identificação do responsável. Em caso de reprovação, o sistema cria automaticamente um novo registro com a gravidade escalada (leve → moderado → grave) e status "Pendente".

**Histórico de Liberação** — exibe os últimos 50 registros de liberações realizadas, com nome do operador, identificador do liberador e data/hora.

---

### Painel de Gestão (`GestaoRec.html`)

Dashboard administrativo utilizado pelo Time de Treinamento com:

- Contadores em tempo real por status: Não Liberadas, Pendentes (sem data), Agendadas (data futura), Aguardando Resultado (data vencida) e Concluídas.
- Listagem filtrada por status com visualização de todos os campos do registro.
- Agendamento de reciclagem: define data de início, data de fim (opcional), responsável e observação. O campo de data agendada é salvo como texto no formato `dd/MM/yyyy HH:mm` ou `dd/MM/yyyy HH:mm até dd/MM/yyyy HH:mm`.
- Registro de resultado final (aprovado ou reprovado) com identificação do responsável pela devolutiva.
- Calendário interativo via FullCalendar mostrando todas as reciclagens com status "Agendado".
- Upload de escala de folgas em `.csv` ou `.xlsx` para cruzamento com datas de agendamento. O arquivo deve conter as colunas: `Operacao`, `NivelOrganizacional`, `Grupo`, `DepartamentoEscala`, `Profissional`, `DataAdmissao`, `CPF`, `Data`, `DescricaoHorario` e `Evento`.

---

## Notificações por E-mail

O sistema envia e-mails automáticos em HTML nos seguintes momentos:

- **Registro de desvio de HSE:** alerta com dados do operador, descrição do ocorrido e link para a evidência fotográfica no Drive, enviado ao superior imediato do operador (buscado pelo CPF na aba `Operadores`, coluna de índice 58).
- **Registro de retorno às atividades:** notificação com dados do colaborador e tipo de retorno.
- **Agendamento de reciclagem:** confirmação com dados do colaborador, data/hora, responsável e observação, enviada ao mesmo superior.

---

## Lógica de Gravidade

As categorias de desvio são classificadas em três níveis, definidos pela cor de fundo da célula na aba `UsuarioPreencher`:

| Cor | Nível |
|---|---|
| Vermelho (`#ff0000`) | grave |
| Laranja (`#ff9900`) | moderado |
| Azul (`#0000ff`) | leve |

Ao reprovar um operador na reciclagem, o sistema cria automaticamente um novo registro com a gravidade incrementada: leve → moderado, qualquer outro → grave.

---

## Estrutura da Planilha

| Aba | Conteúdo |
|---|---|
| `Respostas` | Todos os registros de formulários (34 colunas). Inclui status, data de agendamento, responsável, resultado, liberador e gravidade. |
| `UsuarioPreencher` | Listas de usuários (col. A), máquinas (col. B), categorias com cor de gravidade (col. C), tipos de retorno (col. D) e e-mails de responsáveis (col. F). |
| `Operadores` | Base de funcionários para autocomplete. Colunas relevantes: nome (A), departamento (B), CPF (C), setor (I), turno (K), login (AV/col. 44), e-mail do superior (col. 59). |
| `hse` | Base de usuários do time de HSE, com mesma estrutura da aba `Operadores`, usada para autocomplete no campo de identificação do superior. |
| `Folgas` | Escala de folgas importada via upload. Usada para cruzamento com datas de agendamento. |

### Mapeamento de colunas de `Respostas`

| Coluna | Índice | Campo |
|---|---|---|
| Z | 26 | Status |
| AA | 27 | Data de Agendamento |
| AB | 28 | Responsável |
| AC | 29 | Devolutiva do Responsável |
| AD | 30 | Observação do Agendamento |
| AE | 31 | E-mail do Liberador |
| AF | 32 | Data da Liberação |
| AH | 34 | Gravidade (texto: grave/moderado/leve) |

---

## Tecnologias

| Tecnologia | Finalidade |
|---|---|
| Google Apps Script | Backend, lógica de negócio, integração com APIs do Google |
| Google Sheets | Banco de dados central |
| Google Drive API | Armazenamento de evidências fotográficas |
| Gmail API (MailApp) | Envio automatizado de notificações |
| Drive API (Advanced Service) | Conversão de `.xlsx` para Sheets no upload de folgas |
| HTML5 / CSS3 / JavaScript | Interfaces de usuário |
| Bootstrap 5 | Layout e componentes visuais |
| SweetAlert2 | Modais e confirmações interativas |
| Font Awesome 6 | Ícones |
| FullCalendar | Calendário interativo no painel de gestão |

---

## Estrutura do Repositório

```
reciclagemSys/
├── Código.gs          # Backend principal (Google Apps Script)
├── Formulario.html    # Interface do Time de HSE (formulário + liberação + resultado)
└── GestaoRec.html     # Painel administrativo do Time de Treinamento
```

---

## Configuração e Implantação

**Pré-requisitos**

- Conta Google com acesso ao Google Workspace ou Google pessoal com permissão para Apps Script
- Drive API habilitada em **Services** no editor do Apps Script (necessário para o upload de `.xlsx`)

**Passos**

1. Crie a planilha base no Google Sheets com as abas `Respostas`, `UsuarioPreencher`, `Operadores`, `hse` e `Folgas`.
2. Copie o `SPREADSHEET_ID` da URL da planilha e o `ID` da pasta no Drive destinada ao armazenamento das fotos.
3. Atualize as constantes no topo de `Código.gs`:
   ```javascript
   const CONFIG = {
     SPREADSHEET_ID: '<id-da-planilha>',
     PASTA_IMAGENS_ID: '<id-da-pasta-no-drive>',
     // demais constantes já definidas
   };
   ```
4. No editor do Apps Script, adicione os arquivos `Formulario.html` e `GestaoRec.html` como arquivos HTML do projeto.
5. Habilite a **Drive API** em **Services > Drive API**.
6. Publique como **Web App** em `Implantar > Nova implantação`:
   - Executar como: **Meu usuário**
   - Quem tem acesso: conforme política da organização (usuários da organização ou qualquer pessoa com o link)
7. Conceda as permissões solicitadas (Drive, Gmail, Sheets).
8. Acesse a interface de HSE pela URL padrão e o painel de gestão adicionando `?view=gestaorec` ao final da URL do Web App.

---

## Licença

Distribuído sob a licença Apache 2.0. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido por **Rai Silva / Outbound**.
