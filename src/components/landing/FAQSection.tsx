import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Minha empresa é pequena, preciso me adequar à LGPD?",
    a: "Sim. A LGPD se aplica a qualquer pessoa física ou jurídica que trate dados pessoais, independentemente do porte. A ANPD já regulamentou obrigações simplificadas para pequenas empresas (Resolução CD/ANPD nº 2/2022), mas o tratamento de dados ainda precisa seguir as regras da lei.",
  },
  {
    q: "Preciso contratar um DPO (Encarregado)?",
    a: "Pequenas empresas e startups podem ser dispensadas de indicar um encarregado, conforme a Resolução da ANPD. Ainda assim, é recomendado ter alguém responsável. O AdequaFácil inclui um Portal DPO para facilitar essa gestão.",
  },
  {
    q: "O que acontece se minha empresa não estiver em conformidade?",
    a: "A ANPD pode aplicar advertências, multas de até 2% do faturamento (limitadas a R$ 50 milhões por infração), bloqueio ou eliminação de dados pessoais, além de publicização da infração.",
  },
  {
    q: "Quanto tempo leva para me adequar usando a plataforma?",
    a: "O diagnóstico inicial leva cerca de 15 minutos. Com os módulos integrados, uma pequena empresa pode ter seus principais documentos e processos configurados em poucos dias, não meses.",
  },
  {
    q: "O AdequaFácil gera os documentos que a ANPD pode solicitar?",
    a: "Sim. A plataforma gera automaticamente ROPA, RIPD/DPIA, comunicados de incidentes, inventário de dados, relatório de fornecedores e relatório de conformidade — todos baseados nos dados já cadastrados.",
  },
  {
    q: "Posso usar a plataforma sem conhecimento jurídico?",
    a: "Absolutamente. O AdequaFácil foi projetado para empreendedores e gestores, não para advogados. Linguagem simples, guias passo a passo e automação fazem o trabalho pesado por você.",
  },
  {
    q: "Como a Inteligência Artificial ajuda na conformidade?",
    a: "Nossa IA não apenas gera textos; ela analisa o contexto do seu negócio e prioriza tarefas baseada em criticidade e prazos legais, evitando que você gaste tempo com o que não é urgente.",
  },
  {
    q: "A plataforma é segura para dados sensíveis?",
    a: "Sim. Utilizamos criptografia de ponta, trilha de auditoria imutável e sistema de soft-delete para garantir que nenhuma informação crítica seja perdida ou acessada indevidamente.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="relative border-t border-border/30 py-24 lg:py-32">
      <div className="absolute inset-0 bg-muted/5" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Perguntas frequentes
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Dúvidas sobre LGPD e a plataforma
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border/30">
              <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:text-primary transition-colors">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
