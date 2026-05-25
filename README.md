# Sistema de Gestão de Reciclagem - Luft Logistics

Este projeto é uma solução integrada desenvolvida em **Google Apps Script** e **Google Sheets**, projetada para gerenciar o processo de reciclagem de carteiras de operadores de empilhadeira na **Luft Logistics**. O sistema automatiza desde o registro inicial de desvios de segurança até o agendamento e a conclusão de treinamentos de reciclagem.

## 📋 Visão Geral

O sistema permite que o **Time de HSE** registre ocorrências de **Desvios de Saúde, Segurança e Meio Ambiente** ou solicitações de **Retorno às Atividades**. A gestão administrativa e o acompanhamento do ciclo de reciclagem são realizados pelo **Time de Treinamento**. Dependendo da gravidade, o operador pode ter sua carteira retida e ser encaminhado para um processo de reciclagem, que é gerenciado através de um painel administrativo intuitivo.

## 👥 Perfis de Acesso e Responsabilidades

Para garantir a integridade do processo, o sistema é dividido em dois perfis principais:

| Perfil | Responsabilidade | Interface Principal |
| :--- | :--- | :--- |
| **Time de HSE** | Registro de desvios, coleta de evidências e retirada de carteirinhas. | Formulário de Registro |
| **Time de Treinamento** | Liberação de operadores, agendamento de reciclagens e registro de resultados. | Painel de Gestão (Dashboard) |

## 🚀 Funcionalidades Principais

### 1. Formulário de Registro (Interface do Usuário)
*   **Novo Registro:** Cadastro de ocorrências com preenchimento automático de dados do funcionário via CPF/Login.
*   **Tipos de Solicitação:**
    *   **Desvio de HSE:** Registro detalhado de incidentes, incluindo categoria do desvio, máquina envolvida, local e descrição.
    *   **Retorno às Atividades:** Fluxo para operadores que estão retornando de afastamentos ou outras situações.
*   **Captura de Evidências:** Integração com a câmera do dispositivo para anexar fotos (ex: foto da carteirinha retirada) diretamente no Google Drive.
*   **Notificações Automáticas:** Envio de e-mails formatados em HTML para os responsáveis (RH/HSE) contendo todos os detalhes da ocorrência e links para evidências.

### 2. Painel de Gestão (Dashboard Administrativo)
*   **Indicadores em Tempo Real:** Visualização rápida de status:
    *   🔴 **Não Liberadas:** Operadores com restrições aguardando liberação.
    *   🟡 **Pendentes:** Aguardando agendamento de data e instrutores.
    *   🔵 **Agendadas:** Reciclagens confirmadas no calendário.
    *   🟣 **Aguardando Resultado:** Treinamentos realizados que aguardam aprovação final.
    *   🟢 **Concluídas:** Histórico completo de reciclagens finalizadas.
*   **Calendário Interativo:** Integração com *FullCalendar* para visualização de compromissos e treinamentos agendados.
*   **Gestão de Liberação:** Fluxo de aprovação para permitir que um operador inicie sua reciclagem.

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Google Apps Script** | Engine de backend para processamento de lógica e integração. |
| **Google Sheets** | Banco de dados para armazenamento de registros e configurações. |
| **HTML5 / CSS3 / JS** | Interfaces de usuário modernas e responsivas. |
| **Bootstrap 5** | Framework de design para layout e componentes. |
| **Google Drive API** | Armazenamento seguro de evidências fotográficas. |
| **Gmail API** | Automação de notificações por e-mail. |
| **FullCalendar** | Visualização de cronograma de treinamentos. |

## 📂 Estrutura da Planilha

O sistema utiliza uma planilha centralizada com as seguintes abas:
*   **`Respostas`**: Armazena todos os registros de formulários e status de cada processo.
*   **`UsuarioPreencher`**: Configurações de listas suspensas (usuários, máquinas, categorias, e-mails de notificação).
*   **`Operadores`**: Base de dados de funcionários para consulta e preenchimento automático.

## 🔧 Configuração e Instalação

1.  **Planilha:** Crie uma cópia da planilha base e anote o `SPREADSHEET_ID`.
2.  **Scripts:**
    *   O código do servidor (`Codigo.gs`) deve conter as configurações de IDs de pasta e planilha.
    *   As interfaces HTML (`Formulario.html` e `GestaoRec.html`) devem ser adicionadas como arquivos de script HTML.
3.  **Deploy:** Publique como um **Web App** com acesso configurado para os usuários da organização.
4.  **Permissões:** Garanta que o script tenha permissões para acessar o Google Drive (para upload de fotos) e enviar e-mails em nome do sistema.

---
*Desenvolvido e mantido por **Rai Silva / Outbound**.*
