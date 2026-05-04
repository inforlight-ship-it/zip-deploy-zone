import { FileText, FileCheck, FilePlus2, FileWarning, AlertCircle, Shield, Lock, Users, Building2, Scale, Handshake, BookOpen, ClipboardList } from "lucide-react";

export type DocumentType = "politica_privacidade" | "ripd" | "termos_uso" | "politica_cookies" | "termo_consentimento" | "plano_resposta_incidentes" | "politica_seguranca" | "contrato_operador" | "relatorio_auditoria" | "outro";
export type DocumentStatus = "rascunho" | "em_revisao" | "aprovado" | "publicado" | "arquivado" | "expirado";

export const DOC_TYPE_OPTIONS = [
  { value: "politica_privacidade", label: "Política de Privacidade", icon: FileCheck },
  { value: "ripd", label: "RIPD / DPIA", icon: FileWarning },
  { value: "termos_uso", label: "Termos de Uso", icon: FileText },
  { value: "politica_cookies", label: "Política de Cookies", icon: FileText },
  { value: "termo_consentimento", label: "Termo de Consentimento", icon: FileCheck },
  { value: "plano_resposta_incidentes", label: "Plano de Resposta a Incidentes", icon: AlertCircle },
  { value: "politica_seguranca", label: "Política de Segurança", icon: Shield },
  { value: "contrato_operador", label: "Contrato com Operador (DPA)", icon: Handshake },
  { value: "relatorio_auditoria", label: "Relatório de Auditoria", icon: ClipboardList },
  { value: "outro", label: "Outro", icon: FilePlus2 },
] as const;

export const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho", color: "text-muted-foreground", bg: "bg-muted" },
  { value: "em_revisao", label: "Em Revisão", color: "text-amber-warning", bg: "bg-amber-warning/10" },
  { value: "aprovado", label: "Aprovado", color: "text-sky", bg: "bg-sky/10" },
  { value: "publicado", label: "Publicado", color: "text-primary", bg: "bg-primary/10" },
  { value: "arquivado", label: "Arquivado", color: "text-muted-foreground", bg: "bg-muted" },
  { value: "expirado", label: "Expirado", color: "text-destructive", bg: "bg-destructive/10" },
] as const;

export interface TemplateDefinition {
  type: DocumentType;
  title: string;
  desc: string;
  category: "politica" | "relatorio" | "contrato" | "operacional";
  icon: typeof FileText;
  priority: "essencial" | "recomendado" | "complementar";
  content: string;
}

export const TEMPLATE_CATEGORIES = [
  { key: "politica", label: "Políticas", icon: Shield, desc: "Documentos de governança e normas internas" },
  { key: "relatorio", label: "Relatórios", icon: ClipboardList, desc: "Relatórios de impacto e auditoria" },
  { key: "contrato", label: "Contratos", icon: Handshake, desc: "Acordos com operadores e terceiros" },
  { key: "operacional", label: "Operacionais", icon: BookOpen, desc: "Procedimentos e planos de ação" },
] as const;

export const TEMPLATES: TemplateDefinition[] = [
  // ── POLÍTICAS ──
  {
    type: "politica_privacidade",
    title: "Política de Privacidade",
    desc: "Documento público obrigatório sobre tratamento de dados pessoais conforme LGPD (Art. 9°)",
    category: "politica",
    icon: FileCheck,
    priority: "essencial",
    content: `# Política de Privacidade

## 1. Introdução
A [Nome da Empresa] ("nós", "nosso") está comprometida com a proteção dos dados pessoais de seus usuários, clientes e parceiros. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

## 2. Controlador dos Dados
- Razão Social: [Nome da Empresa]
- CNPJ: [CNPJ]
- Endereço: [Endereço completo]
- Encarregado (DPO): [Nome do DPO]
- E-mail do DPO: [email@empresa.com]
- Canal de atendimento ao titular: [URL do portal]

## 3. Dados Pessoais Coletados
Coletamos os seguintes tipos de dados pessoais:
- **Dados de identificação**: nome completo, CPF, RG, data de nascimento
- **Dados de contato**: e-mail, telefone, endereço
- **Dados de navegação**: cookies, endereço IP, logs de acesso, dados de dispositivo
- **Dados financeiros**: dados bancários e de pagamento (quando aplicável)
- **Dados sensíveis**: [listar se aplicável, conforme Art. 11]

## 4. Finalidades do Tratamento
Os dados são tratados para as seguintes finalidades:
- Prestação e melhoria dos serviços contratados
- Comunicações sobre produtos, serviços e atualizações
- Cumprimento de obrigações legais e regulatórias
- Segurança, prevenção a fraudes e proteção do crédito
- Pesquisas de satisfação e análises estatísticas (anonimizadas)

## 5. Bases Legais (Art. 7° da LGPD)
O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais:
- **Consentimento** do titular (Art. 7°, I)
- **Cumprimento de obrigação legal** ou regulatória (Art. 7°, II)
- **Execução de contrato** ou procedimentos preliminares (Art. 7°, V)
- **Exercício regular de direitos** em processo judicial/administrativo (Art. 7°, VI)
- **Interesse legítimo** do controlador (Art. 7°, IX)
- **Proteção do crédito** (Art. 7°, X)

## 6. Compartilhamento de Dados
Podemos compartilhar dados pessoais com:
- **Operadores contratados**: prestadores de serviço que tratam dados em nosso nome, sob contrato com cláusulas de proteção de dados
- **Autoridades regulatórias**: quando exigido por lei ou determinação judicial
- **Parceiros comerciais**: somente com consentimento expresso do titular

## 7. Transferência Internacional
[Se aplicável] Dados pessoais podem ser transferidos para países que ofereçam grau de proteção adequado ou mediante cláusulas contratuais padrão, conforme Art. 33 da LGPD.

## 8. Retenção dos Dados
Os dados pessoais são retidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, respeitando prazos legais obrigatórios. Após o término do tratamento, os dados serão eliminados conforme Art. 16 da LGPD.

## 9. Direitos do Titular (Art. 18)
Em conformidade com a LGPD, você tem direito a:
- ✅ Confirmar a existência de tratamento de dados
- ✅ Acessar seus dados pessoais
- ✅ Corrigir dados incompletos, inexatos ou desatualizados
- ✅ Solicitar anonimização, bloqueio ou eliminação de dados desnecessários
- ✅ Solicitar a portabilidade dos dados
- ✅ Obter informação sobre compartilhamento com terceiros
- ✅ Revogar o consentimento a qualquer momento

**Para exercer seus direitos**, acesse nosso portal do titular em [URL] ou entre em contato pelo e-mail [email do DPO].

## 10. Segurança dos Dados
Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais, incluindo:
- Criptografia de dados em trânsito e em repouso
- Controle de acesso baseado em perfis
- Monitoramento e registro de acessos (logs de auditoria)
- Política de senhas e autenticação multifator
- Backups regulares e plano de recuperação de desastres

## 11. Contato e Reclamações
Para dúvidas, solicitações ou reclamações relacionadas a esta política:
- **Encarregado (DPO)**: [email do DPO]
- **ANPD**: Caso não tenha obtido resposta satisfatória, você pode reclamar à Autoridade Nacional de Proteção de Dados (www.gov.br/anpd)

Data de vigência: [Data]
Última atualização: [Data]`,
  },
  {
    type: "politica_cookies",
    title: "Política de Cookies",
    desc: "Informações detalhadas sobre uso de cookies e tecnologias de rastreamento",
    category: "politica",
    icon: FileText,
    priority: "essencial",
    content: `# Política de Cookies

## 1. O que são Cookies?
Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita nosso site. Eles ajudam a melhorar a experiência do usuário e a analisar o uso do site.

## 2. Tipos de Cookies Utilizados

### 2.1 Cookies Estritamente Necessários
- **Finalidade**: Essenciais para o funcionamento do site
- **Base legal**: Interesse legítimo
- **Podem ser desativados?**: Não
- Exemplos: cookies de sessão, autenticação, segurança

### 2.2 Cookies de Desempenho/Analíticos
- **Finalidade**: Coletam informações sobre como os visitantes usam o site
- **Base legal**: Consentimento
- **Podem ser desativados?**: Sim
- Exemplos: Google Analytics, Hotjar

### 2.3 Cookies de Funcionalidade
- **Finalidade**: Lembram escolhas feitas pelo usuário (idioma, região)
- **Base legal**: Consentimento
- **Podem ser desativados?**: Sim

### 2.4 Cookies de Marketing/Publicidade
- **Finalidade**: Rastrear visitantes entre sites para exibir anúncios relevantes
- **Base legal**: Consentimento
- **Podem ser desativados?**: Sim
- Exemplos: Facebook Pixel, Google Ads

## 3. Tabela de Cookies

| Cookie | Provedor | Categoria | Duração | Finalidade |
|--------|----------|-----------|---------|------------|
| [nome] | [provedor] | [categoria] | [duração] | [finalidade] |

## 4. Gerenciamento de Preferências
Você pode gerenciar suas preferências de cookies:
- **Banner de consentimento**: exibido na primeira visita ao site
- **Central de preferências**: acessível a qualquer momento em [link]
- **Configurações do navegador**: cada navegador permite controlar cookies

## 5. Cookies de Terceiros
Utilizamos serviços de terceiros que podem instalar cookies:
- [Listar serviços e suas políticas de privacidade]

## 6. Impacto da Desativação
A desativação de cookies não essenciais pode afetar a funcionalidade do site, incluindo [listar funcionalidades].

## 7. Atualizações
Esta política pode ser atualizada periodicamente. A data da última atualização está indicada abaixo.

Última atualização: [Data]`,
  },
  {
    type: "politica_seguranca",
    title: "Política de Segurança da Informação",
    desc: "Normas e diretrizes para proteção de ativos de informação e dados pessoais",
    category: "politica",
    icon: Shield,
    priority: "essencial",
    content: `# Política de Segurança da Informação

## 1. Objetivo
Estabelecer diretrizes e normas de segurança da informação para proteger os ativos de informação da [Nome da Empresa], incluindo dados pessoais tratados conforme a LGPD.

## 2. Escopo
Esta política aplica-se a todos os colaboradores, prestadores de serviço, fornecedores e parceiros que tenham acesso aos sistemas e informações da empresa.

## 3. Princípios
- **Confidencialidade**: acesso restrito a pessoas autorizadas
- **Integridade**: garantia de que os dados não foram alterados indevidamente
- **Disponibilidade**: acesso oportuno e confiável aos dados quando necessário

## 4. Classificação da Informação
| Nível | Descrição | Controles |
|-------|-----------|-----------|
| Confidencial | Dados pessoais sensíveis, segredos comerciais | Criptografia, acesso restrito, DLP |
| Restrito | Dados pessoais, informações internas | Controle de acesso, logs |
| Interno | Informações operacionais gerais | Autenticação de usuário |
| Público | Informações divulgadas publicamente | Sem restrição |

## 5. Controle de Acesso
- Princípio do menor privilégio (least privilege)
- Revisão periódica de acessos (trimestral)
- Autenticação multifator (MFA) obrigatória
- Revogação imediata de acessos ao desligamento

## 6. Proteção de Dados em Trânsito e em Repouso
- TLS 1.2+ para todas as comunicações
- Criptografia AES-256 para dados em repouso
- VPN obrigatória para acesso remoto

## 7. Gestão de Vulnerabilidades
- Scans de vulnerabilidade mensais
- Patches de segurança críticos em até 48 horas
- Testes de penetração anuais

## 8. Gestão de Incidentes
Conforme Plano de Resposta a Incidentes, todos os incidentes de segurança devem ser reportados imediatamente ao time de segurança.

## 9. Backup e Recuperação
- Backups diários incrementais e semanais completos
- Testes de restauração trimestrais
- RPO: [tempo] | RTO: [tempo]

## 10. Uso Aceitável
- Proibido uso de dispositivos pessoais sem autorização (BYOD)
- Proibido instalação de software não autorizado
- Proibido compartilhamento de credenciais

## 11. Treinamento e Conscientização
- Treinamento obrigatório anual sobre segurança da informação e LGPD
- Campanhas periódicas de conscientização (phishing simulado)

## 12. Sanções
O descumprimento desta política pode resultar em medidas disciplinares, conforme regulamento interno.

Responsável: [Nome/Cargo]
Aprovado por: [Nome/Cargo]
Data de vigência: [Data]
Próxima revisão: [Data]`,
  },
  {
    type: "outro",
    title: "Política de Retenção e Descarte de Dados",
    desc: "Define prazos de retenção e procedimentos seguros de descarte de dados pessoais (Art. 16 LGPD)",
    category: "politica",
    icon: Lock,
    priority: "essencial",
    content: `# Política de Retenção e Descarte de Dados Pessoais

## 1. Objetivo
Estabelecer prazos de retenção e procedimentos para descarte seguro de dados pessoais, em conformidade com os Arts. 15 e 16 da LGPD.

## 2. Princípio da Necessidade
Os dados pessoais devem ser mantidos apenas pelo tempo necessário para cumprir a finalidade para a qual foram coletados, ou conforme exigências legais/regulatórias.

## 3. Tabela de Retenção

| Categoria de Dados | Finalidade | Base Legal | Prazo de Retenção | Destino Após Retenção |
|---------------------|-----------|------------|-------------------|-----------------------|
| Dados cadastrais de clientes | Execução do contrato | Art. 7°, V | Vigência do contrato + 5 anos | Eliminação segura |
| Dados de colaboradores | Obrigação trabalhista | Art. 7°, II | Vigência do contrato + 5 anos (CLT) | Eliminação segura |
| Dados financeiros/fiscais | Obrigação fiscal | Art. 7°, II | 5 anos (CTN Art. 173) | Eliminação segura |
| Dados de navegação/cookies | Consentimento | Art. 7°, I | Até revogação ou 12 meses | Eliminação automática |
| Dados de saúde/sensíveis | Obrigação legal | Art. 11°, II | Conforme regulamentação setorial | Eliminação segura |
| Logs de acesso | Marco Civil da Internet | Art. 7°, II | 6 meses (MCI Art. 15) | Eliminação automática |
| CVs/dados de candidatos | Consentimento | Art. 7°, I | 6 meses após processo seletivo | Eliminação segura |

## 4. Procedimentos de Descarte
### 4.1 Dados Digitais
- Eliminação lógica com sobrescrita (wiping)
- Destruição criptográfica (crypto-shredding) quando aplicável
- Certificado de destruição emitido pelo responsável

### 4.2 Dados Físicos
- Fragmentação em trituradora nível P-4 ou superior
- Registro de destruição com testemunhas
- Descarte ecologicamente adequado

## 5. Exceções à Eliminação (Art. 16 LGPD)
Os dados podem ser conservados quando:
- Cumprimento de obrigação legal ou regulatória
- Estudo por órgão de pesquisa (garantida anonimização)
- Transferência a terceiro (respeitando a LGPD)
- Uso exclusivo do controlador (anonimizado)

## 6. Responsabilidades
- **DPO**: supervisão e auditoria do cumprimento
- **TI**: execução técnica do descarte digital
- **Gestores de área**: identificação dos dados sob sua responsabilidade
- **Jurídico**: validação de prazos legais

## 7. Auditoria
Revisão semestral da tabela de retenção e dos processos de descarte.

Aprovado por: [Nome/Cargo]
Data de vigência: [Data]`,
  },
  {
    type: "outro",
    title: "Política de Privacidade para Colaboradores",
    desc: "Aviso de privacidade interno para funcionários sobre tratamento de dados trabalhistas",
    category: "politica",
    icon: Users,
    priority: "recomendado",
    content: `# Política de Privacidade para Colaboradores

## 1. Introdução
A [Nome da Empresa] trata dados pessoais de seus colaboradores em conformidade com a LGPD. Este documento informa quais dados são coletados, para quais finalidades e quais são os direitos dos colaboradores enquanto titulares de dados.

## 2. Dados Coletados
### 2.1 Admissão
- Nome completo, CPF, RG, data de nascimento, filiação
- Endereço, telefone, e-mail pessoal
- Dados bancários para pagamento
- Foto para crachá e sistemas internos
- Exame admissional (dados de saúde - sensíveis)

### 2.2 Durante o Vínculo
- Registros de ponto e jornada
- Avaliações de desempenho
- Dados de treinamentos e certificações
- Dados de acesso a sistemas (logs)
- Imagens de CFTV (quando aplicável)

### 2.3 Desligamento
- Dados do termo de rescisão
- Exame demissional
- Referências profissionais (com consentimento)

## 3. Finalidades e Bases Legais
| Finalidade | Base Legal |
|------------|-----------|
| Gestão do contrato de trabalho | Execução de contrato (Art. 7°, V) |
| Obrigações trabalhistas, previdenciárias e fiscais | Obrigação legal (Art. 7°, II) |
| Saúde e segurança do trabalho | Tutela da saúde (Art. 7°, VIII) / Obrigação legal |
| Controle de acesso e segurança | Interesse legítimo (Art. 7°, IX) |
| Benefícios (plano de saúde, VR, VT) | Execução de contrato |

## 4. Compartilhamento
Dados podem ser compartilhados com:
- Contabilidade e escritório trabalhista
- Operadoras de benefícios (saúde, odontológico)
- Órgãos públicos (eSocial, Receita Federal, INSS)
- Seguradoras (seguro de vida, acidentes)

## 5. Direitos do Colaborador
Todos os direitos previstos no Art. 18 da LGPD são assegurados. Solicitações devem ser feitas pelo e-mail: [email do DPO].

## 6. Monitoramento
[Se aplicável] A empresa realiza monitoramento de e-mail corporativo e navegação na internet em equipamentos da empresa, conforme Política de Uso Aceitável, com base no interesse legítimo.

## 7. Retenção
Os dados serão retidos conforme a Política de Retenção e Descarte, respeitando prazos legais trabalhistas.

Data de vigência: [Data]`,
  },
  // ── RELATÓRIOS ──
  {
    type: "ripd",
    title: "RIPD / DPIA",
    desc: "Relatório de Impacto à Proteção de Dados Pessoais - obrigatório para tratamentos de alto risco (Art. 38)",
    category: "relatorio",
    icon: FileWarning,
    priority: "essencial",
    content: `# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

## 1. Identificação
- **Controlador**: [Razão Social] - CNPJ: [CNPJ]
- **Encarregado (DPO)**: [Nome] - [E-mail] - [Telefone]
- **Responsável pelo relatório**: [Nome/Cargo]
- **Data de elaboração**: [Data]
- **Versão**: [X.X]

## 2. Descrição do Tratamento
### 2.1 Natureza
[Descrever detalhadamente os processos de tratamento de dados pessoais avaliados]

### 2.2 Escopo
- **Volume**: [quantidade estimada de titulares afetados]
- **Categorias de dados**: [pessoais, sensíveis, de menores, etc.]
- **Área geográfica**: [local, nacional, internacional]
- **Frequência**: [contínuo, periódico, eventual]

### 2.3 Contexto
[Descrever o contexto organizacional, mercado, relação com os titulares]

### 2.4 Finalidade
[Descrever as finalidades específicas do tratamento]

## 3. Necessidade e Proporcionalidade
### 3.1 Base Legal Aplicável
[Indicar e justificar a base legal — Art. 7° ou 11° da LGPD]

### 3.2 Princípio da Minimização
[Demonstrar que apenas dados estritamente necessários são coletados]

### 3.3 Qualidade dos Dados
[Descrever mecanismos de atualização e correção]

### 3.4 Prazo de Retenção
[Indicar prazos definidos e justificativa]

## 4. Partes Envolvidas
| Papel | Entidade | Responsável |
|-------|----------|-------------|
| Controlador | [Nome] | [Contato] |
| Operador(es) | [Nome] | [Contato] |
| Sub-operador(es) | [Nome] | [Contato] |

## 5. Avaliação de Riscos
### 5.1 Metodologia
[Descrever a metodologia de avaliação: probabilidade x impacto]

### 5.2 Riscos Identificados
| # | Risco | Probabilidade | Impacto | Nível | Medida Mitigatória |
|---|-------|--------------|---------|-------|-------------------|
| 1 | Acesso não autorizado | [A/M/B] | [A/M/B] | [Crítico/Alto/Médio/Baixo] | [Medida] |
| 2 | Vazamento de dados | [A/M/B] | [A/M/B] | [Nível] | [Medida] |
| 3 | Uso indevido dos dados | [A/M/B] | [A/M/B] | [Nível] | [Medida] |
| 4 | Perda de dados | [A/M/B] | [A/M/B] | [Nível] | [Medida] |

### 5.3 Risco Residual
[Avaliar o risco residual após aplicação das medidas mitigatórias]

## 6. Medidas de Segurança
### 6.1 Técnicas
- [ ] Criptografia de dados em trânsito e repouso
- [ ] Controle de acesso granular
- [ ] Logs de auditoria
- [ ] Pseudonimização/anonimização
- [ ] Firewall e sistemas de detecção de intrusão

### 6.2 Administrativas
- [ ] Política de segurança da informação
- [ ] Treinamento dos colaboradores
- [ ] Acordos de confidencialidade
- [ ] Gestão de incidentes
- [ ] Avaliação periódica de fornecedores

## 7. Direitos dos Titulares
[Descrever como cada direito do Art. 18 é garantido no contexto deste tratamento]

## 8. Consulta ao DPO
**Parecer do DPO**: [Parecer favorável / favorável com ressalvas / desfavorável]
[Justificativa do parecer]

## 9. Conclusão e Recomendações
[Parecer final sobre viabilidade do tratamento e recomendações]

## 10. Aprovação
| Função | Nome | Assinatura | Data |
|--------|------|-----------|------|
| Elaborador | [Nome] | _____________ | [Data] |
| DPO | [Nome] | _____________ | [Data] |
| Aprovador | [Nome] | _____________ | [Data] |`,
  },
  {
    type: "relatorio_auditoria",
    title: "Relatório de Auditoria LGPD",
    desc: "Documento de auditoria interna de conformidade com a LGPD",
    category: "relatorio",
    icon: ClipboardList,
    priority: "recomendado",
    content: `# Relatório de Auditoria de Conformidade LGPD

## 1. Dados da Auditoria
- **Período auditado**: [Data início] a [Data fim]
- **Auditor responsável**: [Nome/Cargo]
- **Escopo**: [Áreas/processos auditados]
- **Tipo**: [Interna / Externa]

## 2. Sumário Executivo
[Resumo dos principais achados, score geral de conformidade e recomendações prioritárias]

## 3. Metodologia
[Descrever a metodologia utilizada: entrevistas, análise documental, testes técnicos, etc.]

## 4. Achados por Domínio

### 4.1 Governança e Cultura
| Controle | Status | Evidência | Criticidade |
|----------|--------|-----------|-------------|
| DPO designado | [✅/❌] | [Evidência] | [Alta/Média/Baixa] |
| Comitê de privacidade | [✅/❌] | [Evidência] | [Criticidade] |
| Treinamentos realizados | [✅/❌] | [Evidência] | [Criticidade] |

### 4.2 Mapeamento de Dados (ROPA)
| Controle | Status | Evidência | Criticidade |
|----------|--------|-----------|-------------|
| Inventário atualizado | [✅/❌] | [Evidência] | [Criticidade] |
| Bases legais definidas | [✅/❌] | [Evidência] | [Criticidade] |

### 4.3 Direitos dos Titulares
| Controle | Status | Evidência | Criticidade |
|----------|--------|-----------|-------------|
| Canal de atendimento | [✅/❌] | [Evidência] | [Criticidade] |
| SLA de resposta | [✅/❌] | [Evidência] | [Criticidade] |

### 4.4 Segurança da Informação
[Incluir controles técnicos avaliados]

### 4.5 Gestão de Terceiros
[Incluir avaliação de fornecedores/operadores]

## 5. Não Conformidades
| # | Descrição | Domínio | Criticidade | Recomendação | Prazo |
|---|-----------|---------|-------------|--------------|-------|
| 1 | [NC] | [Domínio] | [Crítica/Alta/Média/Baixa] | [Recomendação] | [Prazo] |

## 6. Plano de Ação
[Plano de ação para correção das não conformidades identificadas]

## 7. Conclusão
[Parecer final do auditor sobre o nível de conformidade]

## 8. Assinaturas
| Função | Nome | Data |
|--------|------|------|
| Auditor | [Nome] | [Data] |
| DPO | [Nome] | [Data] |
| Diretor | [Nome] | [Data] |`,
  },
  // ── CONTRATOS ──
  {
    type: "contrato_operador",
    title: "Contrato com Operador (DPA)",
    desc: "Acordo de Processamento de Dados com terceiros que tratam dados em nome do controlador (Art. 39)",
    category: "contrato",
    icon: Handshake,
    priority: "essencial",
    content: `# Acordo de Processamento de Dados (DPA)
# Data Processing Agreement

## PARTES
**CONTROLADOR**: [Nome da Empresa], CNPJ [CNPJ], com sede em [Endereço]
**OPERADOR**: [Nome do Fornecedor], CNPJ [CNPJ], com sede em [Endereço]

## 1. OBJETO
Este Acordo estabelece as obrigações e responsabilidades das partes em relação ao tratamento de dados pessoais realizado pelo OPERADOR em nome do CONTROLADOR, em conformidade com a LGPD (Lei nº 13.709/2018).

## 2. DEFINIÇÕES
Os termos utilizados neste Acordo seguem as definições da LGPD (Art. 5°).

## 3. ESCOPO DO TRATAMENTO
### 3.1 Dados Tratados
- **Categorias de dados**: [listar tipos de dados pessoais]
- **Categorias de titulares**: [clientes, colaboradores, etc.]
- **Finalidade**: [descrever finalidade específica]
- **Duração**: [período do tratamento]

### 3.2 Instruções do Controlador
O OPERADOR compromete-se a tratar os dados pessoais exclusivamente conforme as instruções documentadas do CONTROLADOR, salvo obrigação legal.

## 4. OBRIGAÇÕES DO OPERADOR
O OPERADOR deverá:
a) Tratar os dados pessoais apenas conforme instruções do CONTROLADOR
b) Garantir que pessoas autorizadas assumam compromisso de confidencialidade
c) Implementar medidas técnicas e organizacionais de segurança adequadas
d) Não contratar sub-operadores sem autorização prévia por escrito
e) Auxiliar o CONTROLADOR no atendimento a solicitações de titulares
f) Auxiliar o CONTROLADOR nas obrigações de segurança e notificação de incidentes
g) Devolver ou eliminar dados ao término do contrato, conforme escolha do CONTROLADOR
h) Disponibilizar informações necessárias para auditorias

## 5. MEDIDAS DE SEGURANÇA
O OPERADOR implementará, no mínimo:
- Criptografia de dados em trânsito (TLS 1.2+) e em repouso
- Controle de acesso com autenticação multifator
- Registro de logs de acesso e auditoria
- Gestão de vulnerabilidades e patches
- Backup e recuperação de desastres
- Testes de segurança periódicos

## 6. SUB-OPERADORES
O OPERADOR somente poderá contratar sub-operadores com autorização prévia do CONTROLADOR. Os sub-operadores ficarão vinculados às mesmas obrigações deste Acordo.

**Sub-operadores autorizados**: [listar ou referenciar anexo]

## 7. TRANSFERÊNCIA INTERNACIONAL
[Se aplicável] Qualquer transferência internacional de dados deverá cumprir os requisitos do Art. 33 da LGPD.

## 8. INCIDENTES DE SEGURANÇA
O OPERADOR notificará o CONTROLADOR em até **[24/48/72] horas** após tomar conhecimento de incidente que envolva dados pessoais, fornecendo:
- Descrição do incidente
- Dados pessoais afetados
- Medidas adotadas e a adotar

## 9. DIREITOS DOS TITULARES
O OPERADOR auxiliará o CONTROLADOR no atendimento a solicitações de titulares (Art. 18 LGPD) dentro de **[prazo]** úteis.

## 10. AUDITORIA
O CONTROLADOR poderá realizar auditorias ou inspeções, com aviso prévio de **[X] dias**, para verificar o cumprimento deste Acordo.

## 11. VIGÊNCIA E TÉRMINO
Este Acordo vigorará enquanto durar o tratamento de dados. Ao término:
- [ ] Devolver todos os dados ao CONTROLADOR
- [ ] Eliminar todas as cópias (com certificado de destruição)

## 12. PENALIDADES
O descumprimento deste Acordo poderá resultar em:
- Rescisão imediata do contrato principal
- Responsabilização por danos causados
- Multas conforme cláusula penal: [valor/percentual]

## 13. FORO
Fica eleito o foro da comarca de [Cidade/UF].

**ASSINATURAS**
Controlador: _________________ Data: [Data]
Operador: _________________ Data: [Data]`,
  },
  {
    type: "termo_consentimento",
    title: "Termo de Consentimento (LGPD)",
    desc: "Modelo de consentimento livre, informado e inequívoco para coleta de dados pessoais (Art. 8°)",
    category: "contrato",
    icon: FileCheck,
    priority: "essencial",
    content: `# Termo de Consentimento para Tratamento de Dados Pessoais

## CONTROLADOR DOS DADOS
[Nome da Empresa]
CNPJ: [CNPJ]
Encarregado (DPO): [Nome] - [E-mail]

---

Pelo presente termo, eu, abaixo identificado(a), na qualidade de **titular dos dados pessoais**, declaro que fui informado(a) de forma clara e transparente pela [Nome da Empresa], e **CONSINTO** com o tratamento dos meus dados pessoais para as finalidades abaixo descritas:

## 1. DADOS PESSOAIS COLETADOS
- [ ] Nome completo e dados de identificação (CPF, RG)
- [ ] Dados de contato (e-mail, telefone, endereço)
- [ ] Dados de navegação e cookies
- [ ] Dados financeiros
- [ ] Dados sensíveis: [especificar]
- [ ] Outros: [especificar]

## 2. FINALIDADES DO TRATAMENTO
- [ ] Cadastro e prestação de serviços
- [ ] Envio de comunicações e newsletters
- [ ] Pesquisas de satisfação
- [ ] Compartilhamento com parceiros: [especificar quais]
- [ ] Marketing e publicidade direcionada
- [ ] Outras: [especificar]

## 3. COMPARTILHAMENTO
Estou ciente de que meus dados poderão ser compartilhados com:
- [Listar terceiros e finalidade do compartilhamento]

## 4. PRAZO DE TRATAMENTO
Este consentimento é válido até [data ou evento], podendo ser revogado a qualquer momento.

## 5. DIREITOS DO TITULAR
Estou ciente dos meus direitos conforme Art. 18 da LGPD:
- Acesso, correção, exclusão, portabilidade
- Revogação do consentimento a qualquer momento
- Canal de atendimento: [e-mail/portal]

## 6. REVOGAÇÃO
Posso revogar este consentimento a qualquer momento, sem ônus, pelo canal [e-mail/portal]. A revogação não afeta a licitude do tratamento realizado anteriormente.

---

**IDENTIFICAÇÃO DO TITULAR**
Nome: ________________________________
CPF: ________________________________
E-mail: ________________________________

**CONSENTIMENTO**
☐ Li e concordo com os termos acima

Local e Data: ________________________________
Assinatura: ________________________________`,
  },
  // ── OPERACIONAIS ──
  {
    type: "termos_uso",
    title: "Termos de Uso",
    desc: "Termos e condições gerais de uso do serviço/plataforma",
    category: "operacional",
    icon: Scale,
    priority: "essencial",
    content: `# Termos de Uso

## 1. Aceitação
Ao acessar e utilizar os serviços da [Nome da Empresa] ("Plataforma"), você declara que leu, compreendeu e concorda com estes Termos de Uso e com nossa Política de Privacidade.

## 2. Descrição dos Serviços
A Plataforma oferece [descrever os serviços prestados].

## 3. Cadastro e Conta do Usuário
- O usuário deve fornecer informações verdadeiras e atualizadas
- A conta é pessoal e intransferível
- O usuário é responsável pela segurança de suas credenciais
- Notificação imediata em caso de uso não autorizado

## 4. Uso Aceitável
O usuário compromete-se a:
- Não violar leis ou regulamentos aplicáveis
- Não interferir no funcionamento da Plataforma
- Não transmitir conteúdo ilegal, difamatório ou prejudicial
- Não realizar engenharia reversa ou tentativas de acesso não autorizado
- Respeitar os direitos de propriedade intelectual

## 5. Propriedade Intelectual
Todo o conteúdo, software, marcas e tecnologia da Plataforma são de propriedade exclusiva da [Nome da Empresa], protegidos pelas leis de propriedade intelectual.

## 6. Proteção de Dados
O tratamento de dados pessoais é regido por nossa Política de Privacidade, disponível em [link], em conformidade com a LGPD (Lei nº 13.709/2018).

## 7. Responsabilidades e Limitações
### 7.1 Da Empresa
- Manter a Plataforma disponível e funcional
- Proteger os dados pessoais dos usuários
- Comunicar alterações nestes termos com antecedência

### 7.2 Do Usuário
- Utilizar a Plataforma conforme estes termos
- Manter seus dados cadastrais atualizados
- Respeitar os direitos de terceiros

### 7.3 Limitação de Responsabilidade
A [Nome da Empresa] não será responsável por danos indiretos, perdas de lucro ou dados causados por eventos fora de seu controle razoável.

## 8. Suspensão e Cancelamento
A empresa poderá suspender ou cancelar o acesso em caso de violação destes termos, mediante notificação prévia quando possível.

## 9. Modificações
Estes termos podem ser atualizados a qualquer momento. As alterações entrarão em vigor após [X] dias da publicação. O uso continuado constitui aceitação.

## 10. Legislação e Foro
Estes termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca de [Cidade/UF].

## 11. Contato
[Informações de contato]

Data de vigência: [Data]
Última atualização: [Data]`,
  },
  {
    type: "plano_resposta_incidentes",
    title: "Plano de Resposta a Incidentes",
    desc: "Procedimento operacional para detecção, contenção e comunicação de incidentes de segurança (Art. 48)",
    category: "operacional",
    icon: AlertCircle,
    priority: "essencial",
    content: `# Plano de Resposta a Incidentes de Segurança de Dados

## 1. Objetivo
Estabelecer procedimentos para identificação, contenção, erradicação, recuperação e comunicação de incidentes de segurança que envolvam dados pessoais, conforme Art. 48 da LGPD.

## 2. Escopo
Este plano aplica-se a todos os incidentes que possam afetar a confidencialidade, integridade ou disponibilidade de dados pessoais tratados pela [Nome da Empresa].

## 3. Equipe de Resposta a Incidentes (CSIRT)
| Função | Nome | Contato | Responsabilidade |
|--------|------|---------|------------------|
| Líder de Incidentes | [Nome] | [Telefone/E-mail] | Coordenação geral |
| DPO | [Nome] | [Telefone/E-mail] | Avaliação de impacto e comunicação ANPD |
| TI/Segurança | [Nome] | [Telefone/E-mail] | Contenção e análise técnica |
| Jurídico | [Nome] | [Telefone/E-mail] | Análise legal e regulatória |
| Comunicação | [Nome] | [Telefone/E-mail] | Comunicação interna e externa |
| Diretoria | [Nome] | [Telefone/E-mail] | Aprovação de decisões estratégicas |

## 4. Classificação de Incidentes
| Nível | Descrição | Tempo de Resposta | Escalação |
|-------|-----------|-------------------|-----------|
| 🔴 Crítico | Vazamento massivo de dados sensíveis / ransomware | Imediato (< 1h) | Diretoria + DPO + Jurídico |
| 🟠 Alto | Acesso não autorizado a dados pessoais | 2 horas | DPO + TI |
| 🟡 Médio | Tentativa de intrusão / phishing com sucesso parcial | 4 horas | TI + DPO |
| 🟢 Baixo | Anomalia sem comprometimento confirmado | 24 horas | TI |

## 5. Fases da Resposta

### 5.1 Detecção e Identificação
- [ ] Registrar data/hora da detecção
- [ ] Identificar tipo e escopo do incidente
- [ ] Classificar a severidade
- [ ] Notificar o líder de incidentes e DPO

### 5.2 Contenção
- [ ] Isolar sistemas afetados
- [ ] Preservar evidências forenses
- [ ] Bloquear vetores de ataque identificados
- [ ] Revogar credenciais comprometidas

### 5.3 Erradicação
- [ ] Eliminar a causa raiz
- [ ] Remover artefatos maliciosos
- [ ] Aplicar patches/correções
- [ ] Verificar integridade dos sistemas

### 5.4 Recuperação
- [ ] Restaurar sistemas a partir de backups limpos
- [ ] Monitoramento intensivo pós-recuperação
- [ ] Validar integridade dos dados restaurados
- [ ] Reavaliar controles de segurança

### 5.5 Pós-Incidente
- [ ] Relatório detalhado do incidente
- [ ] Análise de lições aprendidas
- [ ] Atualização de políticas e controles
- [ ] Treinamento adicional se necessário

## 6. Comunicação à ANPD (Art. 48)
A comunicação à ANPD deve ser feita em **prazo razoável** (recomendação: até 72 horas) quando o incidente puder acarretar risco ou dano relevante aos titulares. O comunicado deve conter:
- Descrição da natureza dos dados pessoais afetados
- Informações sobre os titulares envolvidos
- Indicação das medidas técnicas e de segurança utilizadas
- Riscos relacionados ao incidente
- Motivos da demora (se não comunicado imediatamente)
- Medidas adotadas para reverter ou mitigar os efeitos

## 7. Comunicação aos Titulares
Quando o incidente puder acarretar risco ou dano relevante, os titulares devem ser comunicados contendo:
- Descrição dos dados afetados
- Medidas que estão sendo tomadas
- Recomendações de proteção individual
- Canal de contato para dúvidas

## 8. Registro e Documentação
Todo incidente deve ser documentado com:
- Data/hora de detecção e cada fase
- Descrição completa do incidente
- Dados/sistemas afetados
- Ações tomadas em cada fase
- Decisões e justificativas
- Resultados e lições aprendidas

## 9. Testes e Simulações
- Simulações de incidente: **semestrais**
- Revisão do plano: **anual** ou após cada incidente real
- Tabletop exercises: **trimestrais**

Aprovado por: [Nome/Cargo]
Data de vigência: [Data]
Próxima revisão: [Data]`,
  },
  {
    type: "outro",
    title: "Registro de Operações de Tratamento (ROPA)",
    desc: "Registro estruturado de todas as atividades de tratamento de dados pessoais (Art. 37)",
    category: "operacional",
    icon: BookOpen,
    priority: "essencial",
    content: `# Registro de Operações de Tratamento de Dados (ROPA)
## Record of Processing Activities

**Controlador**: [Nome da Empresa] - CNPJ: [CNPJ]
**DPO**: [Nome] - [E-mail]
**Data de atualização**: [Data]

---

## Atividade de Tratamento #1

| Campo | Descrição |
|-------|-----------|
| **Nome da atividade** | [Ex: Cadastro de Clientes] |
| **Departamento** | [Ex: Comercial] |
| **Responsável** | [Nome/Cargo] |
| **Descrição** | [Descrição detalhada do tratamento] |
| **Finalidade** | [Finalidade específica] |
| **Base legal** | [Art. 7° ou 11° — especificar inciso] |
| **Categorias de titulares** | [Clientes, colaboradores, etc.] |
| **Categorias de dados** | [Nome, CPF, e-mail, etc.] |
| **Dados sensíveis?** | [Sim/Não — se sim, detalhar] |
| **Fonte dos dados** | [Coleta direta, terceiros, etc.] |
| **Forma de coleta** | [Formulário web, presencial, etc.] |
| **Armazenamento** | [Sistema, localização, formato] |
| **Prazo de retenção** | [Período e justificativa] |
| **Compartilhamento** | [Com quem e para qual finalidade] |
| **Transferência internacional** | [Sim/Não — se sim, país e salvaguarda] |
| **Medidas de segurança** | [Criptografia, controle de acesso, etc.] |
| **Operador(es)** | [Fornecedores que tratam os dados] |
| **Status** | [Ativo/Inativo/Em revisão] |

---

## Atividade de Tratamento #2
[Repetir a estrutura acima para cada atividade]

---

## Resumo Estatístico
| Métrica | Valor |
|---------|-------|
| Total de atividades mapeadas | [N] |
| Atividades com dados sensíveis | [N] |
| Atividades com transferência internacional | [N] |
| Atividades baseadas em consentimento | [N] |
| Operadores envolvidos | [N] |

## Próxima Revisão
Data: [Data]
Responsável: [Nome]`,
  },
  {
    type: "outro",
    title: "Política de Treinamento e Conscientização",
    desc: "Programa de capacitação em proteção de dados e LGPD para colaboradores",
    category: "operacional",
    icon: Users,
    priority: "recomendado",
    content: `# Política de Treinamento e Conscientização em Proteção de Dados

## 1. Objetivo
Garantir que todos os colaboradores, prestadores de serviço e terceiros compreendam suas responsabilidades no tratamento de dados pessoais e estejam capacitados para atuar em conformidade com a LGPD.

## 2. Público-Alvo
| Grupo | Treinamento | Periodicidade |
|-------|-------------|---------------|
| Todos os colaboradores | LGPD Básico | Admissão + Anual |
| Gestores/Líderes | LGPD para Líderes | Semestral |
| TI/Segurança | Segurança de Dados | Trimestral |
| RH | Dados de Colaboradores | Semestral |
| Marketing/Comercial | Consentimento e Cookies | Semestral |
| DPO/Privacidade | Atualização LGPD/ANPD | Contínuo |

## 3. Conteúdo Programático

### 3.1 Módulo Básico (Todos)
- O que é a LGPD e por que importa
- Conceitos fundamentais (dado pessoal, titular, controlador, operador)
- Bases legais para tratamento
- Direitos dos titulares
- Como identificar e reportar incidentes
- Boas práticas no dia a dia

### 3.2 Módulo Intermediário (Gestores)
- Princípios do tratamento de dados
- Privacy by Design e by Default
- Avaliação de impacto (RIPD)
- Gestão de consentimento
- Responsabilidades do líder

### 3.3 Módulo Avançado (TI/DPO)
- Medidas técnicas de segurança
- Criptografia e anonimização
- Gestão de vulnerabilidades
- Resposta a incidentes
- Auditoria e compliance

## 4. Metodologia
- E-learning com módulos interativos
- Workshops presenciais/remotos
- Simulações de phishing
- Estudos de caso
- Avaliações de conhecimento

## 5. Avaliação e Certificação
- Prova ao final de cada módulo (mínimo 70% para aprovação)
- Certificado digital de conclusão
- Registro de participação no histórico do colaborador

## 6. Campanhas de Conscientização
- Newsletter mensal sobre privacidade
- Comunicados sobre incidentes (sem dados sensíveis)
- Semana da Privacidade (anual)
- Material visual (cartazes, screensavers)

## 7. Métricas
| Indicador | Meta |
|-----------|------|
| % colaboradores treinados | 100% |
| Taxa de aprovação | > 80% |
| Taxa de clique em phishing simulado | < 5% |
| Incidentes reportados proativamente | Crescente |

## 8. Responsabilidades
- **DPO**: definição do conteúdo e supervisão
- **RH**: logística e registro
- **TI**: plataforma e simulações

Data de vigência: [Data]
Próxima revisão: [Data]`,
  },
];

export const getStatusInfo = (s: DocumentStatus) => STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];
export const getTypeInfo = (t: DocumentType) => DOC_TYPE_OPTIONS.find((o) => o.value === t) || DOC_TYPE_OPTIONS[DOC_TYPE_OPTIONS.length - 1];
