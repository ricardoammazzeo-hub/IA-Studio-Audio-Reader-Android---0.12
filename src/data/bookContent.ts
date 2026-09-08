import { SectionItem, ChapterSummary } from '../types';

export const BOOK_METADATA = {
  title: 'Mito e pensamento entre os gregos',
  subtitle: 'Estudos de psicologia histórica',
  author: 'Jean-Pierre Vernant',
  translator: 'Haiganuch Sarian (Museu de Arqueologia e Etnologia da USP)',
  reviewer: 'Erika Pereira Nunes',
  publisher: 'Paz e Terra — 2ª edição revista',
  originalTitle: 'Mythe et pensée chez les Grecs',
  totalChapters: 7,
};

export const AUDIOBOOK_SECTIONS: SectionItem[] = [
  // -------------------------------------------------------------
  // INTRODUÇÃO (pp. 15-23)
  // -------------------------------------------------------------
  {
    id: 'intro',
    chapterId: 'intro',
    chapterNumber: 0,
    chapterTitle: 'Introdução',
    partTitle: 'Introdução Geral',
    subtitle: 'A I. Meyerson',
    pageRange: 'pp. 15–23',
    durationEstimateMinutes: 12,
    paragraphs: [
      {
        id: 'intro-p1',
        page: 15,
        text: 'Se decidimos agrupar em um volume estudos cujos temas podem parecer bastante diversos, é porque os concebemos como partes de uma mesma investigação. Faz já uns dez anos que nos esforçamos em aplicar no domínio dos estudos gregos as pesquisas de psicologia histórica cujo promotor na França é I. Meyerson. A matéria dos nossos estudos são os documentos nos quais trabalham os especialistas, helenistas e historiadores da Antiguidade. Nossa perspectiva, no entanto, é outra. Quer se trate de fatos religiosos — mitos, rituais, representações figuradas —, de filosofia, de ciência, de arte, de instituições sociais, de fatos técnicos ou econômicos, nós os consideramos sempre na qualidade de obras criadas pelos homens, como expressão de uma atividade mental organizada. Por meio dessas obras, buscamos aquilo que o homem foi, este homem grego antigo que não se pode separar do quadro social e cultural do qual ele é, ao mesmo tempo, o criador e o produto.'
      },
      {
        id: 'intro-p2',
        page: 16,
        text: 'Empresa difícil, pelo seu caráter necessariamente indireto, e que, além disso, corre o risco de não ser sempre bem recebida. No contato com os textos, os documentos figurados, os realia sobre os quais nós mesmos devemos nos apoiar, os especialistas têm os seus problemas e as suas técnicas próprias; o estudo do homem e das suas funções psicológicas lhes é mais frequentemente estranho. Os psicólogos e os sociólogos encontram-se, pela orientação atual das suas investigações, muito comprometidos no mundo contemporâneo para se interessar por uma Antiguidade clássica, que abandonam à curiosidade dos humanistas, um pouco antiquada aos seus olhos.'
      },
      {
        id: 'intro-p3',
        page: 16,
        text: 'E, no entanto, se existe na verdade uma história do homem interior, solidária da história das civilizações, devemos retomar a resolução que lançava, há alguns anos, Z. Barbu, em seus Problems of historical psychology: “Back to the Greeks!”. Com efeito, na perspectiva de uma psicologia histórica, a volta aos gregos nos parece impor-se por várias razões. A primeira é de ordem prática. A documentação relativa à Grécia é ao mesmo tempo mais extensa, mais diferenciada, mais bem elaborada que a de outras civilizações. História social e política, história da religião, história da arte e do pensamento, dispomos cada vez mais de trabalhos numerosos, sólidos, precisos. A essas vantagens de fato, acrescentam-se argumentos de conteúdo. As obras que a Grécia antiga criou são bastante “diferentes” daquelas que formam o nosso universo espiritual para nos expatriar de nós mesmos, para nos dar, com a sensação da distância histórica, a consciência de uma transformação do homem. Ao mesmo tempo, elas não nos são estranhas, como outras. Transmitiram-se até nós sem solução de continuidade. Ainda estão vivas nas tradições culturais às quais não cessamos de nos ligar. O homem grego, bastante afastado de nós para que seja possível estudá-lo como um objeto, e como um objeto diverso, ao qual não se aplicam exatamente as nossas categorias psicológicas de hoje, é, entretanto, bastante próximo para que possamos sem muitos obstáculos entrar em comunicação com ele, compreender a linguagem que fala em suas obras, atingir, além dos textos e documentos, os conteúdos mentais, as formas de pensamento e de sensibilidade, os modos de organização do querer e dos atos, em resumo, uma arquitetura do espírito.'
      },
      {
        id: 'intro-p4',
        page: 17,
        text: 'Há uma última razão, enfim, que orienta através da Antiguidade clássica o historiador do homem interior. No espaço de alguns séculos, a Grécia conheceu, em sua vida social e espiritual, transformações decisivas. Nascimento da Cidade e do direito — advento, entre os primeiros filósofos, de um pensamento de tipo racional e de uma organização progressiva do saber em um corpo de disciplinas positivas diferenciadas: ontologia, matemática, lógica, ciências da natureza, medicina, moral, política —, criação de formas de arte novas, de novos modos de expressão, assim inventados, correspondendo à necessidade de autentificar os aspectos até então desconhecidos da experiência humana: poesia lírica e teatro trágico nas artes da linguagem, escultura e pintura concebidas como artifícios imitativos nas artes plásticas.'
      },
      {
        id: 'intro-p5',
        page: 17,
        text: 'Essas inovações em todos os domínios marcam uma mudança de mentalidade tão profunda que se pôde ver nela o registro de nascimento do homem ocidental, o surgimento verdadeiro do espírito, com os valores que reconhecemos nesse termo. De fato, nas transformações não interessam somente os passos da inteligência ou os mecanismos do raciocínio. Do Homo religiosus das culturas arcaicas até este homem, político e racional, que apontam as definições de um Aristóteles, a mutação põe em causa os grandes quadros do pensamento e todo o conjunto das funções psicológicas: modos de expressão simbólica e manejamento dos sinais, tempo, espaço, causalidade, memória, imaginação, organização dos atos, vontade, pessoa, todas essas categorias mentais encontram-se transformadas em sua estrutura interna e seu equilíbrio geral.'
      },
      {
        id: 'intro-p6',
        page: 17,
        text: 'Dois temas retiveram, mais do que os outros, a atenção dos helenistas durante o último meio século: a passagem do pensamento mítico à razão, a construção progressiva da pessoa. Tratamos desses dois problemas de maneira desigual. O primeiro é o objeto de um estudo de conjunto. Limitamo-nos quanto ao segundo a um aspecto particular. Parece-nos, contudo, necessário, a fim de evitar mal-entendidos, definir a nossa posição tanto num caso como no outro. Ao intitular Do mito à razão o estudo que encerra este volume, não pretendemos tratar do pensamento mítico em geral, como não admitimos a existência de um pensamento racional imutável. Acentuamos, ao contrário, em nossas últimas linhas, que os gregos não inventaram a razão, mas uma razão, ligada a um contexto histórico, diferente daquela do homem de hoje. Existem mesmo, acreditamos, nisso que se chama o pensamento mítico, formas diversas, níveis múltiplos, modos de organização e como que tipos de lógica diferentes.'
      },
      {
        id: 'intro-p7',
        page: 18,
        text: 'No caso da Grécia, a evolução intelectual que vai de Hesíodo a Aristóteles pareceu-nos seguir, no essencial, duas orientações: em primeiro lugar, estabelece-se uma distinção clara entre o mundo da natureza, o mundo humano, o mundo das forças sagradas, sempre mais ou menos mescladas ou aproximadas pela imaginação mítica, que às vezes confunde esses diversos domínios, às vezes opera por deslize de um plano a um outro, às vezes estabelece entre todos os setores do real um jogo de correspondências sistemáticas. Em segundo lugar, o pensamento “racional” tende a eliminar essas noções polares e ambivalentes que representam no mito um papel importante; ele renuncia a utilizar as associações por contraste, a acasalar e unir os opostos a progredir por reviramentos sucessivos; em nome de um ideal de não-contradição e de univocidade, ele afasta todo modo de raciocínio que procede do ambíguo ou do equívoco.'
      },
      {
        id: 'intro-p8',
        page: 18,
        text: 'Sob essa forma geral, nossas conclusões têm um caráter provisório. Visam sobretudo traçar um programa de investigação. Reclamam estudos mais limitados, porém mais precisos: tal mito em tal autor, tal conjunto mítico, com todas as suas variantes, nas diversas tradições gregas. Somente investigações concretas que fixem a evolução do vocabulário, da sintaxe, dos modos de composição, da escolha e do ordenamento dos temas, desde Hesíodo e Ferecides até os pré-socráticos, permitirão seguir as transformações da instrumentagem mental, das técnicas de pensamento, dos processos lógicos. Nesse sentido, nosso estudo final deve ser lido como referência àquele que inicia este volume: desenvolvendo tanto quanto nos foi possível a análise estrutural de um mito particular, o mito hesiódico das raças, quisemos descrever uma forma de pensamento que não é incoerente, mas cujo movimento, rigor e lógica têm um caráter próprio, pois a construção mítica repousa, em seu plano de conjunto como no pormenor das diversas partes, no equilíbrio e na tensão de noções polares. Na perspectiva do mito, essas noções exprimem a polaridade de forças sagradas, ao mesmo tempo opostas e associadas. Encontramos assim na obra de Hesíodo um “modelo” de pensamento próximo em vários pontos daquele que, sob a forma do grupo Héstia-Hermes, pareceu-nos comandar a mais antiga experiência religiosa do espaço e do movimento que os gregos puderam ter.'
      },
      {
        id: 'intro-p9',
        page: 19,
        text: 'Pode surpreender talvez que não tenhamos poupado um lugar maior, na economia desta coleção, para a análise da pessoa. Na verdade, se existe uma área em que os helenistas se conduziram, pelo próprio curso das suas investigações, a tratar dos problemas psicológicos, é exatamente a que se refere à pessoa. Do homem homérico, sem unidade real, sem profundidade psicológica, acometido por impulsos súbitos, por inspirações sentidas como divinas, de qualquer modo estranho a si mesmo e aos seus atos, até o homem grego da idade clássica, as transformações da pessoa são notáveis. Descoberta da dimensão interior do sujeito, distanciamento com relação ao corpo, unificação das forças psicológicas, surgimento do indivíduo ou, pelo menos, de certos valores ligados ao indivíduo como tal, progresso do sentido da responsabilidade, engajamento mais preciso do agente em seus atos, todos esses desenvolvimentos da pessoa foram, por parte dos especialistas, objeto de investigações e de discussões que interessam muito diretamente à psicologia histórica. Se não quisemos fazer um balanço do conjunto desses elementos, não é apenas porque um psicólogo o tenha tentado antes. Z. Barbu retraçou, com uma perspectiva próxima da nossa, o que ele denomina The emergence of personality in the greek world. Aceitando muitas das suas análises e aconselhando ao leitor a sua consulta, estaríamos tentados a exprimir duas ordens de reserva em relação às suas conclusões.'
      },
      {
        id: 'intro-p10',
        page: 20,
        text: 'Em primeiro lugar, o autor parece-nos forçar um pouco as coisas no quadro em que descreve o desenvolvimento da pessoa: pelo fato de ter levado em consideração todas as categorias de documentos, e sobretudo pelo fato de examiná-los de muito perto, ele os interpreta às vezes com um sentido muito moderno e projeta sobre a pessoa grega alguns traços que, segundo nós, aparecerão apenas em uma época mais recente. Em segundo, o seu estudo, ainda que dirigido sob um ponto de vista histórico, não está livre de toda preocupação normativa. Para Z. Barbu, os gregos descobriram a verdadeira pessoa: ao edificar o ser interior sobre o equilíbrio entre dois processos psíquicos opostos, por um lado a “individualização” que realiza a integração das forças internas do indivíduo em torno de um centro único, por outro a “racionalização” que integra os indivíduos em uma ordem superior (social, cósmica, religiosa), os gregos teriam elaborado a forma perfeita da pessoa, o seu modelo.'
      },
      {
        id: 'intro-p11',
        page: 20,
        text: 'Ora, as objeções que nos parecem precisamente suscitar, do ponto de vista psicológico, os trabalhos de certos helenistas procedem do fato de eles desconhecerem ao mesmo tempo a complexidade de uma categoria psicológica como a pessoa, cujas dimensões são múltiplas, e a sua relatividade histórica. Considerando-a como uma forma acabada, da qual se poderia dar uma definição simples e geral, têm às vezes tendência a orientar a investigação como se se tratasse de saber se os gregos conheceram a pessoa, ou não a conheceram, ou a partir de que momento fizeram a sua descoberta. Para o psicólogo historiador, o problema não se colocaria nesses termos: não há, não pode haver uma pessoa-modelo, exterior ao curso da história humana, com as suas vicissitudes, as suas variedades segundo os lugares, as suas transformações segundo o tempo. A investigação não deve procurar estabelecer, então, se a pessoa existe na Grécia, mas buscar o que é a pessoa grega antiga, no que ela difere, na multiplicidade dos seus traços, da pessoa de hoje: quais aspectos nela se encontram, em tal momento, mais ou menos delineados e sob que forma, quais são aqueles que permanecem desconhecidos, quais dimensões do eu aparecem já expressas em tal tipo de obras, de instituições ou de atividades humanas e em que nível de elaboração, quais são as linhas de desenvolvimento da função, as suas direções principais, como também os tateamentos, os ensaios abortados, as tentativas sem futuro, qual é, enfim, o grau de sistematização da função, eventualmente o seu centro, o seu aspecto característico.'
      },
      {
        id: 'intro-p12',
        page: 21,
        text: 'Uma tal investigação pressupõe que se tenha determinado previamente, no conjunto dos fatos de civilização que a Grécia nos oferece, aqueles que se referem mais especialmente a um ou outro aspecto da pessoa, que se saiba definir os tipos de obras e de atividades pelos quais o homem grego construiu os quadros da sua experiência interior, como construiu, por meio da ciência e da técnica, os quadros da sua experiência do mundo físico. A investigação teria, pois, que recobrir um campo muito vasto e muito diverso: fatos de língua e de transformação do vocabulário, especialmente do vocabulário psicológico; história social, em particular história do direito, mas também da família e das instituições políticas; grandes capítulos de história do pensamento, como aqueles que dizem respeito às noções de alma, de corpo, de individuação; história das ideias morais: vergonha, culpa, responsabilidade, mérito; história da arte, em particular os problemas que coloca o aparecimento de novos gêneros literários: poesia lírica, teatro trágico, biografia, autobiografia, romance, uma vez que esses três últimos termos podem ser empregados sem anacronismo no mundo grego; história da pintura e da escultura, com o advento do retrato; e, finalmente, história da religião.'
      },
      {
        id: 'intro-p13',
        page: 21,
        text: 'Não podendo tratar de todas essas questões no quadro de um pequeno estudo, preferimos deter-nos apenas nos fatos religiosos. E ainda consideramos apenas a religião da época clássica sem levar em conta aquilo que o período helenístico pôde oferecer como inovação. A investigação devia orientar-se de um modo tanto mais rigoroso já que era, no início, mais limitada. Reduzida ao domínio religioso, ela devia distinguir cuidadosamente os diversos planos e procurar saber, em cada um deles, em que medida se refere à história da pessoa, até que ponto crenças e práticas religiosas, pelas suas implicações psicológicas, comprometem o status interior do sujeito e participam da elaboração de um eu. Pode-se ver que, no conjunto, as nossas conclusões são negativas e que fomos levados a marcar, sobretudo, as diferenças, a ressaltar as distâncias que separam, em sua vida religiosa, o grego do século V da pessoa do crente de nossos dias.'
      },
      {
        id: 'intro-p14',
        page: 22,
        text: 'Em sua maior parte, o nosso trabalho é consagrado às categorias psicológicas que, por falta de uma ligação entre helenistas e psicólogos, não foram ainda o objeto de investigações dirigidas com uma perspectiva histórica: a memória e o tempo, o espaço, o trabalho e a função técnica, a imagem e a categoria do “duplo”.'
      },
      {
        id: 'intro-p15',
        page: 22,
        text: 'Nossos capítulos mais substanciosos referem-se ao trabalho e ao espaço. O trabalho marcou tão profundamente a vida social e o homem contemporâneos que se é levado muito naturalmente a crer que ele se revestiu sempre dessa forma unificada e organizada que lhe reconhecemos atualmente. Precisávamos mostrar, ao contrário, que o significado das condutas de trabalho, a sua posição no grupo e no indivíduo modificaram-se muito. Para um estudo histórico do espaço, os fatos gregos pareceram-nos especialmente esclarecedores. Não somente o pensamento científico dos gregos, mas o pensamento social e político caracterizam-se por um geometrismo que contrasta fortemente com as antigas representações do espaço, atestadas nos mitos e nas práticas religiosas. Tínhamos, pois, a ocasião de seguir, com um exemplo de certa maneira privilegiado, a transformação dos quadros da representação espacial. Acreditamos poder discernir os fatores que, no caso grego, determinaram a passagem de um espaço religioso, qualitativo, diferenciado, hierarquizado, a um espaço homogêneo e reversível, de tipo geométrico.'
      },
      {
        id: 'intro-p16',
        page: 22,
        text: 'Nosso estudo sobre o kolossós e a categoria psicológica do “duplo” deve ser lido como uma primeira contribuição a uma investigação mais extensa sobre o advento da imagem no sentido próprio, o aparecimento de uma atividade criadora de imagens (quer se trate de objetos artificiais que têm um caráter puramente “imitativo” ou de produtos mentais com um objetivo propriamente “imaginante”), a elaboração de uma função psicológica do imaginário.'
      },
      {
        id: 'intro-p17',
        page: 23,
        text: 'Procurando abrir todo o domínio do helenismo às investigações sobre psicologia histórica, não dissimulamos nem as dificuldades de uma empresa que ultrapassa demasiadamente as nossas forças, nem a insuficiência dos resultados que podemos oferecer. Quisemos franquear um caminho, colocar problemas, provocar investigações.'
      },
      {
        id: 'intro-p18',
        page: 23,
        text: 'Se a nossa tentativa puder contribuir a suscitar um trabalho de equipe agrupando helenistas, historiadores, sociólogos e psicólogos, se ela fizer almejar um plano de conjunto para o estudo das transformações psicológicas que a experiência grega preparou e da viragem que ela operou na história do homem interior, este livro não terá sido escrito em vão.'
      }
    ]
  },

  // -------------------------------------------------------------
  // CAPÍTULO 1 - PARTE 1 (pp. 27-35)
  // -------------------------------------------------------------
  {
    id: 'cap1-part1',
    chapterId: 'cap1',
    chapterNumber: 1,
    chapterTitle: '1. Estruturas do mito',
    partTitle: 'Parte 1: O mito hesiódico das raças (Ensaio estrutural - Seção A)',
    subtitle: 'Os dois mitos em Hesíodo, Díke e Hýbris, a escala dos metais e o problema dos heróis',
    pageRange: 'pp. 27–35',
    durationEstimateMinutes: 14,
    paragraphs: [
      {
        id: 'c1p1-h1',
        page: 27,
        text: '1. Estruturas do mito: O mito hesiódico das raças. Ensaio de análise estrutural',
        isHeading: true
      },
      {
        id: 'c1p1-p1',
        page: 27,
        text: 'O poema de Hesíodo Os trabalhos e os dias inicia-se com duas narrativas míticas. Depois de ter indicado com algumas palavras a existência de uma dúplice Luta (Éris), Hesíodo conta a história de Prometeu e de Pandora; logo em seguida, apresenta uma narrativa que vem, diz ele, “coroar” a primeira: o mito das raças. Os dois mitos estão ligados. Ambos mencionam um tempo antigo em que os homens viviam ao abrigo dos sofrimentos, das doenças e da morte; cada um presta contas, à sua maneira, dos males que se tornaram, em seguida, inseparáveis da condição humana. O mito de Prometeu comporta uma moral tão clara que Hesíodo não sente necessidade de desenvolvê-la; limita-se a deixar falar a sua narrativa: pela vontade de Zeus que, a fim de vingar o roubo do fogo, escondeu ao homem a sua vida, isto é, o seu alimento, os seres humanos são destinados ao trabalho, a partir de então; devem aceitar essa dura lei divina e não poupar esforço nem fadiga. Do mito das raças, Hesíodo tira um ensinamento que dirige mais especialmente ao seu irmão Perses, um pobre tipo, mas que vale também para os grandes da terra, para aqueles cuja função é regulamentar as querelas por arbitragem, para os reis. Hesíodo resume este ensinamento na seguinte fórmula: escuta a justiça, Díke, não deixes aumentar a desmedida, Hýbris. Mas não vemos bem, se nos detemos na interpretação corrente do mito, em que ele pode comportar um ensinamento desse gênero.'
      },
      {
        id: 'c1p1-p2',
        page: 28,
        text: 'Com efeito, a história conta a sucessão das diversas raças de homens que, precedendo-nos na Terra, apareceram e depois desapareceram alternativamente. Em que uma tal narrativa é suscetível de exortar à Justiça? Todas as raças, as melhores e as piores, tiveram do mesmo modo que deixar a luz do sol, no momento chegado. E entre aquelas que os homens honram com um culto desde que a terra os recobriu, há as raças que se ilustraram aqui na terra por uma espantosa Hýbris. Além do mais, as raças parecem suceder-se de acordo com uma ordem de decadência progressiva e regular. De fato, elas se aparentam aos metais de que tiram o nome e cuja hierarquia ordena-se do mais precioso ao menos precioso, do superior ao inferior: em primeiro lugar o ouro, depois a prata, o bronze, em seguida, e finalmente, o ferro. Assim, o mito parece querer opor a um mundo divino, em que a ordem é imutavelmente fixada desde a vitória de Zeus, um mundo humano no qual a desordem se instala pouco a pouco e que deve acabar virando inteiramente para o lado da injustiça, da desgraça e da morte. Mas este quadro de uma humanidade destinada a uma queda fatal e irreversível não parece muito próprio para convencer Perses e os reis sobre as virtudes da Díke e os perigos da Hýbris.'
      },
      {
        id: 'c1p1-p3',
        page: 28,
        text: 'A essa primeira dificuldade, que se refere às relações entre o mito, tal como nos é apresentado, e o significado que Hesíodo lhe dá em seu poema, acrescenta-se uma segunda que interessa à estrutura do mito propriamente dito. Às raças de ouro, de prata, de bronze e de ferro, Hesíodo adiciona uma quinta, a dos heróis, que não tem correspondente metálico. Intercalada entre as gerações do bronze e do ferro, ela destrói o paralelismo entre raças e metais; além disso, interrompe o movimento de decadência contínuo, simbolizado por uma escala metálica com valor regularmente decrescente: o mito sublinha, com efeito, que a raça dos heróis é superior à de bronze, que a precedeu.'
      },
      {
        id: 'c1p1-p4',
        page: 29,
        text: 'Ao constatar essa anomalia, E. Rohde anotava que Hesíodo devia ter motivos poderosos para introduzir na arquitetura da narrativa um elemento claramente estranho ao mito original e cuja intrusão parece quebrar o seu esquema lógico. Ele observava que o que interessa essencialmente Hesíodo, no caso dos heróis, não é a sua existência terrestre, mas o seu destino póstumo. Já para cada uma das outras raças, Hesíodo indica, de um lado, o que foi a sua vida na terra; de outro, no que ela se tornou uma vez abandonada a luz do sol. O mito atenderia assim a uma preocupação dupla: de início, expor a degradação moral crescente da humanidade; em seguida, fazer conhecer o destino, para além da morte, das gerações sucessivas. Se a presença dos heróis, ao lado das outras raças, está deslocada em relação ao primeiro objetivo, ela se justifica plenamente do ponto de vista do segundo. No caso dos heróis, a intenção acessória tornar-se-ia a principal.'
      },
      {
        id: 'c1p1-p5',
        page: 29,
        text: 'Partindo dessas observações, V. Goldschmidt propõe uma explicação que vai mais além. Segundo esse autor, o destino das raças metálicas, depois do seu desaparecimento da vida terrestre, consiste em uma “promoção” ao nível das forças divinas. Os homens das raças de ouro e de prata tornam-se demônios, dáimones, após a morte; os de bronze formam a população dos mortos no Hades. Apenas os heróis não se beneficiam de uma transformação que só lhes poderia dar o que já possuem: são heróis, e heróis permanecem. Mas essa inserção na narrativa explica-se, quando observamos que a sua presença é indispensável para completar o quadro dos seres divinos que distingue, conforme a classificação tradicional, ao lado dos theói, deuses propriamente ditos, dos quais não se trata na narrativa, as categorias seguintes: os demônios, os heróis, os mortos.'
      },
      {
        id: 'c1p1-p6',
        page: 30,
        text: 'Hesíodo teria, pois, elaborado a sua narrativa mítica unificando, adaptando uma à outra, duas tradições diversas, sem dúvida independentes na origem: de um lado, um mito genealógico das raças relacionado com um simbolismo dos metais e que contava o declínio moral da humanidade; de outro, uma divisão estrutural do mundo divino, cuja explicação era preciso fornecer, remanejando o esquema mítico primitivo para reservar um lugar aos heróis. Desse modo, o mito das idades oferecer-nos-ia o mais antigo exemplo de uma conciliação entre o ponto de vista da gênese e o da estrutura, de uma tentativa de fazer corresponder termo por termo as fases de uma série temporal e os elementos de uma estrutura permanente.'
      },
      {
        id: 'c1p1-p7',
        page: 30,
        text: 'A interpretação de V. Goldschmidt tem o grande mérito de acentuar a unidade e a coerência interna do mito hesiódico das raças. Pode-se concordar de bom grado que, em sua primeira forma, a narrativa não tenha comportado a raça dos heróis. Mas Hesíodo repensou o tema mítico no seu conjunto segundo suas próprias preocupações. Devemos, pois, tomar a narrativa tal como se apresenta no contexto de Os trabalhos e os dias, e nos interrogar acerca do seu significado sob essa forma.'
      },
      {
        id: 'c1p1-p8',
        page: 30,
        text: 'Impõe-se, a esse respeito, uma observação preliminar. Não se poderia falar, no caso de Hesíodo, de uma antinomia entre mito genético e divisão estrutural. Para o pensamento mítico, toda genealogia é ao mesmo tempo e principalmente explicitação de uma estrutura; e não há outra maneira de esclarecer uma estrutura senão apresentá-la sob a forma de uma narrativa genealógica. Em nenhuma das suas partes o mito das idades oferece exceção a essa regra. E a ordem, segundo a qual as raças se sucedem na Terra, não é propriamente cronológica. Como poderia sê-lo? Hesíodo não tem noção de um tempo único e homogêneo no qual as diversas raças viriam fixar-se em um lugar definitivo. Cada raça possui uma temporalidade própria, uma idade, que exprime sua natureza particular e que, do mesmo modo que seu gênero de vida, suas atividades, suas qualidades e defeitos, define o seu status e a contrapõe às outras raças.'
      },
      {
        id: 'c1p1-p9',
        page: 31,
        text: 'Se a raça de ouro é denominada “a primeira”, não é porque tenha aparecido, um belo dia, antes das outras, em um tempo linear e irreversível. Ao contrário, se Hesíodo a faz figurar no início da sua narrativa, é porque ela encarna as virtudes — simbolizadas pelo ouro — que ocupam o cume de uma escala de valores intemporais. A sucessão das raças no tempo reproduz uma ordem hierárquica permanente do universo. Quanto ao conceito de uma decadência progressiva e contínua, que os comentadores concordam em reconhecer no mito, ele não é apenas incompatível com o episódio dos heróis (dificilmente se admitirá que Hesíodo não se tenha apercebido disso); não se enquadra também na noção de um tempo que não é linear, em Hesíodo, mas cíclico. As idades sucedem-se para formar um ciclo completo que, quando termina, recomeça, na mesma ordem, ou na ordem inversa, como no mito platônico do Político, o tempo cósmico desenvolvendo-se alternativamente em um sentido e depois em outro; Hesíodo lamenta-se porque ele próprio pertence à quinta e última raça, a do ferro; nesse momento, exprime o pesar por não ter morrido antes ou por não ter nascido depois, observação incompreensível na perspectiva de um tempo humano inclinado constantemente para o pior, mas que se esclarece se admitirmos que a série das idades compõe, como a sucessão das estações, um ciclo renovável.'
      },
      {
        id: 'c1p1-p10',
        page: 32,
        text: 'No quadro desse ciclo, a sucessão das raças, mesmo afora o caso dos heróis, não parece seguir de modo algum uma ordem de decadência contínua. A terceira raça não é “pior” do que a segunda e Hesíodo não diz isso. O texto caracteriza os homens de prata pela sua louca desmedida e impiedade, os de bronze pelas suas obras de desmedida. Em que há progresso na decadência? Há tão pouco que a raça de prata é a única cujos erros excitam a ira divina e que Zeus aniquila como castigo pela sua impiedade. Os homens de bronze morrem, como os heróis, nos combates da guerra. Quando Hesíodo quer estabelecer uma diferença de valor entre duas raças, ele a formula explicitamente e sempre da mesma maneira: as duas raças são opostas como a Díke e a Hýbris. Um contraste desse gênero se ressalta, de um lado, entre a primeira e a segunda raça; de outro, entre a terceira e a quarta. Mais exatamente, a primeira raça está para a segunda, do ponto de vista do “valor”, como a quarta está para a terceira. Com efeito, Hesíodo acentua que os homens de prata são “bem inferiores” aos de ouro — inferioridade que consiste em uma Hýbris da qual os primeiros estão perfeitamente isentos; ele acentua ainda que os heróis são “mais justos” que os homens de bronze, votados igualmente à Hýbris. Ao contrário, não estabelece entre a segunda e a terceira raça nenhuma comparação de valor: os homens de bronze são simplesmente denominados “diferentes” dos homens de prata.'
      },
      {
        id: 'c1p1-p11',
        page: 33,
        text: 'O texto impõe, então, quanto à relação entre as quatro primeiras raças, a seguinte estrutura: distinguem-se dois planos diferentes, ouro e prata de um lado, bronze e heróis de outro. Cada plano, dividido em dois aspectos antitéticos, um positivo, outro negativo, apresenta assim duas raças associadas que formam a contrapartida necessária uma da outra e que contrastam, respectivamente, como Díke e Hýbris.'
      },
      {
        id: 'c1p1-p12',
        page: 33,
        text: 'O que distingue o plano das duas primeiras raças e o das raças seguintes é, como veremos, o fato de se relacionarem a funções diferentes, de representarem tipos de agentes humanos, formas de ação, estados sociais e “psicológicos” opostos. Deveremos particularizar esses diversos elementos, mas pode-se notar logo uma primeira dissimetria. No primeiro plano, Díke constitui o valor dominante: começa-se com ela; Hýbris, elemento secundário, vem como contraponto; no segundo plano, é o inverso: o aspecto Hýbris é o principal. Desse modo, ainda que os dois planos comportem igualmente um aspecto justo e um aspecto injusto, pode-se dizer que, tomados em seu conjunto, eles se contrapõem por sua vez um ao outro como Díke e Hýbris. É o que explica a diferença de destino que, depois da morte, contrapõe as duas primeiras raças às duas seguintes. Os homens de ouro e de prata são igualmente o objeto de uma promoção no sentido próprio: homens perecíveis, transformam-se em dáimones. A complementaridade que os liga, contrapondo-os, marca-se no mundo do além e em sua existência terrestre: os primeiros formam os demônios epictônios; os segundos, os demônios hipoctônios. A ambos, os homens prestam “honras”: honra real, basíleion, no que se refere aos primeiros; “menor”, no que se refere aos segundos, uma vez que também são “inferiores” aos primeiros; mas é sempre uma honra, e que não pode se justificar pelas virtudes ou méritos que, no caso dos homens de prata, não existem, mas apenas por pertencerem ao mesmo plano de realidade que os homens de ouro, por representarem, em seu aspecto negativo, a mesma função.'
      },
      {
        id: 'c1p1-p13',
        page: 34,
        text: 'Diferente é o destino póstumo das raças de bronze e dos heróis. Ambas desconhecem uma promoção, como raça. Não se pode chamar “promoção” o destino dos homens de bronze que é de uma banalidade completa: mortos na guerra, tornam-se os defuntos “anônimos” do Hades. A maioria dos que formam a raça heróica partilha dessa sorte comum. Apenas alguns privilegiados dessa raça mais justa escapam ao medíocre anonimato da morte e conservam, pela graça de Zeus que os recompensa com este favor particular, um nome e uma existência individuais no mundo do além: transportados para a ilha dos Bem-aventurados, eles levam uma vida livre de todas as preocupações. Mas não são objeto de nenhuma veneração, de nenhuma honraria por parte dos homens. E. Rohde ressaltou justamente “o completo isolamento” da sua permanência em um mundo desligado do nosso. Ao contrário dos dáimones, os heróis desaparecidos não têm poder sobre os vivos e os vivos não lhes prestam nenhum culto.'
      },
      {
        id: 'c1p1-p14',
        page: 34,
        text: 'Essas simetrias, marcadas muito fortemente, mostram que, na versão hesiódica do mito, a raça dos heróis não constitui um elemento mal integrado que desfigura a arquitetura da narrativa, mas uma peça essencial sem a qual o equilíbrio do conjunto estaria rompido. Ao contrário, é a quinta raça que parece então criar problemas: ela introduz uma dimensão nova, um terceiro plano de realidade, que, ao contrário das precedentes, não se desdobraria em dois aspectos antitéticos, mas se apresentaria sob a forma de uma raça única. O texto mostra, entretanto, que na realidade não há uma Idade do Ferro mas dois tipos de existência humana, rigorosamente opostos, num dos quais se situa Díke, em outro apenas Hýbris.'
      },
      {
        id: 'c1p1-p15',
        page: 35,
        text: 'Com efeito, Hesíodo vive em um mundo em que os homens nascem jovens e morrem velhos, em que há leis “naturais” (a criança assemelha-se ao pai) e “morais” (deve-se respeitar o hóspede, os pais, o juramento), um mundo em que o bem e o mal, intimamente mesclados, se equilibram. Anuncia a vinda de uma outra vida que será, em todos os pontos, o contrário da primeira: os homens nascerão velhos com as têmporas embranquecidas, a criança nada terá de comum com o seu pai, não se conhecerão nem amigos, nem irmãos, nem pais, nem juramentos; o direito será representado unicamente pela força; neste mundo entregue à desordem e à Hýbris, não virá mais nenhum bem para compensar os sofrimentos do homem. Vê-se, então, como o episódio da Idade do Ferro, em seus dois aspectos, pode articular-se com os temas precedentes para completar a estrutura de conjunto do mito. Enquanto o primeiro nível concernia mais especialmente ao exercício da Díke (nas relações dos homens entre si e com os deuses), o segundo, a manifestação da força e da violência físicas, ligadas à Hýbris, o terceiro se refere a um mundo humano ambíguo, definido pela coexistência dos seus contrários; nele, todo bem tem o seu mal em contrapartida — o homem implica a mulher; o nascimento, a morte; a juventude, a velhice; a abundância, a fadiga; a felicidade, a desgraça. Díke e Hýbris, presentes lado a lado, oferecem ao homem duas opções igualmente possíveis entre as quais lhe é necessário escolher. Nesse universo confuso, que é o próprio mundo de Hesíodo, o poeta opõe a perspectiva aterradora de uma vida humana em que Hýbris teria triunfado totalmente, um mundo ao avesso em que subsistiriam apenas desordem e desgraça em estado puro.'
      }
    ]
  },

  // -------------------------------------------------------------
  // CAPÍTULO 1 - PARTE 2 (pp. 36-45)
  // -------------------------------------------------------------
  {
    id: 'cap1-part2',
    chapterId: 'cap1',
    chapterNumber: 1,
    chapterTitle: '1. Estruturas do mito',
    partTitle: 'Parte 2: O mito hesiódico das raças (Ensaio estrutural - Seção B)',
    subtitle: 'O simbolismo do ouro e dos reis, a prata ímpia, o bronze e a violência guerreira',
    pageRange: 'pp. 36–45',
    durationEstimateMinutes: 15,
    paragraphs: [
      {
        id: 'c1p2-p1',
        page: 36,
        text: 'Estaria então fechado o ciclo das idades e o tempo só teria de retornar em sentido inverso. Na Idade do Ouro, tudo era ordem, justiça e felicidade: era o reinado da pura Díke. Ao termo do ciclo na velha Idade do Ferro, tudo será entregue à desordem, à violência e à morte: será o reinado da pura Hýbris. De um reinado ao outro, a série das idades não marca uma decadência progressiva. Em lugar de uma sequência temporal contínua, há fases que se alternam segundo as relações de oposição e de complementaridade. O tempo não decorre segundo uma sucessão cronológica, mas conforme as relações dialéticas de um sistema de antinomias do qual nos resta marcar a correspondência com certas estruturas permanentes da sociedade humana e do mundo divino.'
      },
      {
        id: 'c1p2-p2',
        page: 36,
        text: 'Os homens da raça de ouro aparecem sem ambiguidade como os Régios, os basilêes, que ignoram toda forma de atividade exterior ao domínio da soberania. Com efeito, dois traços definem negativamente esse modo de vida: não conhecem a guerra e vivem tranquilos — o que os opõe aos homens de bronze e aos heróis, votados ao combate. Também não conhecem o labor, pois a terra produz-lhes “espontaneamente” numerosos bens — o que os opõe, desta vez, aos homens de ferro, cuja existência é votada ao pónos e que são constrangidos a trabalhar a terra a fim de produzir o seu alimento.'
      },
      {
        id: 'c1p2-p3',
        page: 36,
        text: 'O ouro de que essa raça tira o nome é também símbolo real, como já foi demonstrado. Na versão platônica do mito, ele distingue e qualifica, entre as diferentes espécies de homens, aqueles que são feitos para comandar, árchein. A raça de ouro situa-se no tempo de Crono quando ele reinava no céu. Crono é o deus soberano, que se liga à função real: em Olímpia, um colégio de sacerdotes oferecia-lhe sacrifícios no cume do monte Crono, todos os anos por ocasião do equinócio da primavera; esses sacerdotes chamavam-se Régios, basílai. Por fim, é um privilégio real, basíleion géras, que cabe à raça de ouro, uma vez desaparecida, e a transforma em demônios epictônios. A expressão basíleion géras adquire todo o seu valor se se observar que esses demônios se encarregam, no mundo do além, de duas funções que, segundo a concepção mágico-religiosa da realeza, manifestam a virtude benéfica do bom rei: como phýlakes, guardiães dos homens, velam pela observância da justiça; como ploutodótai, dispensadores de riquezas, favorecem a fecundidade do solo e dos rebanhos.'
      },
      {
        id: 'c1p2-p4',
        page: 37,
        text: 'Além disso, as mesmas expressões, as mesmas fórmulas e as mesmas palavras que definem os homens da antiga raça de ouro aplicam-se também, em Hesíodo, ao rei justo do mundo de hoje. Os homens de ouro vivem “como deuses”; e, no início da Teogonia, o rei justo, quando se adianta na assembleia, prestes a apaziguar as querelas, a cessar a desmedida pela sábia doçura da sua palavra, é saudado por todos como um deus. O mesmo quadro de festas, festejos e de paz, no meio da abundância que generosamente dispensa uma terra livre de toda contaminação, repete-se por duas vezes: a primeira descreve a existência feliz dos homens de ouro; a segunda, a vida na cidade que, sob o reinado do rei justo e piedoso, desabrocha em prosperidade sem fim. Ao contrário, no momento em que o basiléus esquece-se de que é “o descendente de Zeus”, e, sem temer os deuses, trai a função que seu cetro simboliza, afastado dos caminhos retos da Díke, por Hýbris, a cidade conhece só calamidades, destruição e fome. É que, próximos aos reis, misturando-se aos humanos, 30 mil imortais invisíveis vigiam a justiça e a piedade dos soberanos, em nome de Zeus. Nenhuma ofensa feita pelos reis à Díke deixará de ser mais cedo ou mais tarde punida por intermédio deles.'
      },
      {
        id: 'c1p2-p5',
        page: 38,
        text: 'Assim, a mesma figura do Bom Soberano se projeta ao mesmo tempo em três planos: em um passado mítico, dá a imagem da humanidade primitiva, na Idade de Ouro; na sociedade de hoje, encarna-se na figura do rei justo e piedoso; no mundo sobrenatural, representa uma categoria de demônios que velam, em nome de Zeus, pelo exercício regular da função real.'
      },
      {
        id: 'c1p2-p6',
        page: 38,
        text: 'A prata não possui um valor simbólico próprio. Ela se define com relação ao ouro: metal precioso, como o ouro, mas inferior. Do mesmo modo, a raça de prata, inferior àquela que a precedeu, só existe e se define com relação a ela: no mesmo plano que a raça de ouro, constitui a sua contrapartida exata, o seu inverso. À soberania piedosa opõe-se a soberania ímpia; à figura do rei respeitoso da Díke, a do rei entregue à Hýbris. Com efeito, o que arruina os homens de prata é “a louca desmedida” da qual não podem se abster em suas relações recíprocas e em suas relações com os deuses. Essa Hýbris que os caracteriza não extravasa o plano da soberania. Ela nada tem a ver com a Hýbris guerreira. Os homens de prata, como os de ouro, permanecem estranhos aos trabalhos militares que não lhes concernem mais do que os do campo. Sua desmedida se exerce em um terreno exclusivamente religioso e teológico. Recusam-se a oferecer sacrifícios aos deuses olímpicos; se praticam a adikía entre si é porque não querem reconhecer a soberania de Zeus, mestre da Díke. Entre os Régios, a Hýbris assume naturalmente a forma de impiedade. Do mesmo modo, ao traçar o quadro do rei injusto, Hesíodo ressalta que, se ele pronuncia sentenças erradas, se ele oprime o homem, é porque não teme os deuses.'
      },
      {
        id: 'c1p2-p7',
        page: 39,
        text: 'Por sua impiedade, a raça de prata é exterminada pela cólera de Zeus; contrapartida da raça de ouro, ela se beneficia de honras análogas depois da sua punição. A solidariedade funcional entre as duas raças mantém-se, além da morte, pelo paralelismo entre demônios epictônios e demônios hipoctônios. Os homens de prata apresentam, por outro lado, analogias notáveis com uma outra categoria de personagens míticas, os Titãs: o mesmo caráter, a mesma função, o mesmo destino. Os Titãs são divindades de Hýbris. Ao ser mutilado, Urano acusa-os pela sua loucura orgulhosa, e o próprio Hesíodo os qualifica de orgulhosos que têm o poder como vocação. São candidatos à soberania. Entram em competição com Zeus para a arché e a dynastéia do universo. Ambição natural, se não legítima: os Titãs são os Régios. Em face de uma soberania da ordem, representada por Zeus e pelos Olímpicos, os Titãs encarnam a soberania da desordem e da Hýbris. Vencidos, eles devem deixar a luz do dia, como os homens de prata: precipitados para longe do céu, para além mesmo da superfície da terra, também desaparecem sob a terra.'
      },
      {
        id: 'c1p2-p8',
        page: 40,
        text: 'Assim, o paralelismo das raças de ouro e de prata não se afirma somente pela presença, em cada um dos três domínios em que se projetava a figura do rei justo, do seu “duplo”: o rei da Hýbris. Ele se acha, além disso, confirmado pela exata correspondência entre raças de ouro e de prata; de um lado, Zeus e de outro, Titãs. É a própria estrutura dos mitos hesiódicos de soberania que encontramos na narrativa das duas primeiras raças da humanidade.'
      },
      {
        id: 'c1p2-p9',
        page: 40,
        text: 'A raça de bronze introduz-nos em uma esfera de ação diferente. Retomemos as expressões de Hesíodo: “Nascida dos freixos, terrível e vigorosa, essa raça não se assemelha em nada à raça de prata; ela só pensa nos trabalhos de Ares e na Hýbris”. Não se poderia indicar de modo mais explícito que a desmedida dos homens de bronze, em lugar de aproximá-los dos homens de prata, separa-os: Hýbris, exclusivamente militar, que caracteriza o comportamento do guerreiro. Passamos do plano jurídico-religioso ao das manifestações da força brutal, do vigor físico e do terror que a personagem do guerreiro inspira. Os homens de bronze só se dedicam à guerra. Não há também, em seu caso, alusão ao exercício da justiça (sentenças certas ou erradas), nem ao culto em honra dos deuses (piedade ou impiedade), assim como nos casos precedentes não se aludia a comportamentos militares. Os homens de bronze são igualmente estranhos às atividades que caracterizam o terceiro plano, o da raça de ferro: não se alimentam de pão, o que faz supor que ignoram o trabalho da terra e a cultura dos cereais. A morte decorre do seu tipo de vida. Não são aniquilados por Zeus, mas sucumbem à guerra, uns sob os golpes dos outros, vencidos “por seus próprios braços”, isto é, pela força física que exprime a essência da sua natureza. Não têm direito a nenhuma honraria: “ainda que tenham sido aterrorizadores”, eles se perdem no anonimato da morte.'
      },
      {
        id: 'c1p2-p10',
        page: 41,
        text: 'A essas indicações claras, o poeta acrescenta alguns pormenores com valor simbólico que as completam. De início, a referência ao bronze, cujo significado não é menos preciso que o do ouro. O próprio deus Ares tem o epíteto de chálkeos. É que o bronze, por certas virtudes que lhe são atribuídas, aparece intimamente ligado, no pensamento religioso dos gregos, à força com que se revestem as armas defensivas do guerreiro. O brilho metálico do “bronze ofuscante”, este clarão do metal que faz resplandecer a planície e “que sobe até o céu”, lança o terror na alma do inimigo; o som do bronze ao se entrechocar, esta phoné que revela a sua natureza de metal animado e vivo, afasta os sortilégios do adversário. A estas armas defensivas — couraça, capacete e escudo — de bronze, associa-se na panóplia do guerreiro mítico uma arma ofensiva, a lança, ou melhor, o dardo, de madeira.'
      },
      {
        id: 'c1p2-p11',
        page: 42,
        text: 'Pode-se mesmo particularizar mais. A lança é feita de uma madeira ao mesmo tempo leve e muito dura, a madeira do freixo. E a mesma palavra designa ora o dardo, ora a árvore da qual ele provém: melía. Compreende-se que a raça de bronze seja denominada por Hesíodo como originada dos freixos, ek meliôn. As Melíai, Ninfas dessas árvores de guerra que se erguem para o céu como lanças, são constantemente associadas, no mito, aos seres sobrenaturais que encarnam a figura do guerreiro. Ao lado dos homens de bronze nascidos dos freixos, é preciso mencionar o gigante Talo, cujo corpo é inteiramente de bronze, guardião de Creta, dotado de uma invulnerabilidade condicional, como Aquiles, e que apenas as magias de Medeia poderão vencer: Talo origina-se de um freixo. O grupo dos Gigantes, que representa o tipo de uma confraria militar e que também se beneficia de uma invulnerabilidade condicional, está em relação direta com as Ninfas Melíai.'
      },
      {
        id: 'c1p2-p12',
        page: 43,
        text: 'A origem mítica dos tebanos não é diferente. Os Espartos, dos quais se originaram, são igualmente Gegenéis, que surgiram da terra completamente armados para começar logo a combater uns contra os outros. A história desses Espartos, desses “Semeados”, merece uma análise melhor: ela esclarece certos pormenores no modo de vida e no destino dos homens de bronze. Ao chegar ao local onde deve fundar Tebas, Cadmo envia os seus companheiros para buscarem água na fonte de Ares, guardada por uma serpente. Essa serpente, apresentada ora como um Gegenés, ora como um filho de Ares, mata os homens do grupo; o herói vence o monstro. A conselho de Atena, semeia os dentes do monstro por toda a planície, um pedíon. Nesse campo, germinam e surgem num instante homens adultos, completamente armados. Apenas nascidos, travam entre si um combate mortal; perecem, como os homens de bronze, sob os seus próprios golpes, com exceção de cinco sobreviventes, antepassados da aristocracia tebana.'
      },
      {
        id: 'c1p2-p13',
        page: 44,
        text: 'O mesmo esquema ritual encontra-se, em uma forma mais precisa, no mito de Jasão na Cólquida. A prova que o rei Aietes impõe ao herói consiste em uma lavragem de caráter bem particular: deve dirigir-se, não longe da cidade, a um campo denominado pedíon de Ares, colocar sob o jugo dois touros monstruosos, com os cascos de bronze, vomitando fogo; deve atrelá-los a uma charrua; levá-los a traçar um sulco de duzentos ares e semear nele os dentes do dragão de onde logo nascerá uma coorte de Gigantes armados, em luta. Essa lavragem, façanha especificamente militar, que não tem relação com a fecundidade do solo, nem efeito sobre a virtude nutridora, permite talvez compreender uma observação de Hesíodo: no verso 146, o poeta ressalta que os homens da Idade do Bronze “não comem pão”; pouco depois, ele afirma que “as suas armas eram de bronze, de bronze as suas casas, com o bronze eles lavravam”. A contradição parece evidente: por que lavrar a terra se não se come o trigo? A dificuldade seria eliminada se a lavragem dos homens de bronze, aproximada à que efetua Jasão, devesse ser considerada como um rito guerreiro, e não como um trabalho agrícola.'
      },
      {
        id: 'c1p2-p14',
        page: 45,
        text: 'Entre a lança, atributo militar, e o cetro, símbolo real, há diferença de valor e de plano. A lança é normalmente submissa ao cetro. Quando essa hierarquia não é mais respeitada, a lança exprime a Hýbris como o cetro exprime a Díke. Para o guerreiro, a Hýbris consiste em querer apenas conhecer a lança, em se dedicar a ela inteiramente. Originária da lança, dedicada a Ares, inteiramente estranha ao plano jurídico e religioso, a raça de bronze projeta no passado a figura do guerreiro votado à Hýbris, uma vez que desconhece tudo o que ultrapassa a sua própria natureza.'
      }
    ]
  },

  // -------------------------------------------------------------
  // CAPÍTULO 1 - PARTE 3 (pp. 46-59)
  // -------------------------------------------------------------
  {
    id: 'cap1-part3',
    chapterId: 'cap1',
    chapterNumber: 1,
    chapterTitle: '1. Estruturas do mito',
    partTitle: 'Parte 3: O mito hesiódico das raças (Ensaio estrutural - Seção C)',
    subtitle: 'Os Heróis, os Cem-braços, a Idade do Ferro, Pandora e a estrutura trifuncional',
    pageRange: 'pp. 46–59',
    durationEstimateMinutes: 16,
    paragraphs: [
      {
        id: 'c1p3-p1',
        page: 46,
        text: 'A raça dos heróis define-se, em relação à do bronze, como a sua contrapartida na mesma esfera funcional. São guerreiros; lutam na guerra, morrem na guerra. A Hýbris dos homens da raça de bronze, em vez de aproximá-los dos homens da raça de prata, separava-os. Inversamente, a Díke dos heróis, em lugar de separá-los dos homens de bronze, une-os, contrapondo-os. Com efeito, a raça dos heróis é denominada mais justa e ao mesmo tempo mais valorosa militarmente. A sua Díke se situa no mesmo plano militar que a Hýbris dos homens de bronze. Ao guerreiro, votado por sua própria natureza à Hýbris, opõe-se o guerreiro justo que, reconhecendo os seus limites, aceita submeter-se à ordem superior da Díke.'
      },
      {
        id: 'c1p3-p2',
        page: 46,
        text: 'Essas duas figuras antitéticas do combatente são aquelas que Ésquilo acampa dramaticamente uma em face da outra, em Os sete contra Tebas: em cada porta, ergue-se um guerreiro de Hýbris, selvagem e frenético; semelhante a um Gigante, profere sarcasmos ímpios contra os deuses soberanos e contra Zeus; em cada vez, lhe é oposto um guerreiro “mais justo e mais corajoso” cujo ardor no combate, temperado pela sophrosýne, sabe respeitar tudo o que tem valor sagrado.'
      },
      {
        id: 'c1p3-p3',
        page: 47,
        text: 'Encarnações do guerreiro justo, os heróis, pelo favor de Zeus, são transportados para a ilha dos Bem-aventurados, onde levam por toda a eternidade uma vida semelhante à dos deuses. Nos mitos de soberania, uma categoria de seres sobrenaturais corresponde exatamente à raça dos heróis e vem situar-se, na hierarquia dos agentes divinos, no lugar reservado ao guerreiro servidor da ordem. O reinado dos Olímpicos supunha uma vitória sobre os Gigantes, representando a função militar. Mas a soberania não poderia privar-se da força; o cetro deve apoiar-se na lança. Zeus tem necessidade da companhia de Krátos e de Bía, e estes nunca o deixam, nunca se afastam do deus.'
      },
      {
        id: 'c1p3-p4',
        page: 47,
        text: 'Para obter a sua vitória sobre os Titãs, os Olímpicos tiveram de recorrer à força e chamar os “guerreiros” em socorro. Os Cem-braços, que lhes proporcionam o sucesso, são, na verdade, guerreiros semelhantes em todos os pontos aos Gigantes e aos homens de bronze: insaciáveis pela guerra, orgulhosos pela força, aterrorizam pela estatura e vigor dos seus numerosos braços. São a encarnação de Krátos e de Bía. Submissos a Zeus, não aparecem mais como seres caracterizados pela pura arrogância; o valor militar, entre estes guardiães fiéis de Zeus, vai, desde então, lado a lado com a sophrosýne. A função guerreira, desde então associada à soberania, integra-se a ela em lugar de se opor. O reinado da ordem não é mais ameaçado por nada.'
      },
      {
        id: 'c1p3-p5',
        page: 48,
        text: 'O quadro da vida humana na Idade do Ferro não nos surpreende. Já por duas vezes Hesíodo o traçou, na introdução e na conclusão do mito de Prometeu. As doenças, a velhice e a morte; a ignorância do amanhã e a angústia do futuro; a existência de Pandora, a mulher; e a necessidade do labor; tantos elementos, disparatados para nós, mas cuja solidariedade compõe, para Hesíodo, um quadro único. Os temas de Prometeu e de Pandora formam as duas partes de uma única e mesma história: a da miséria humana na Idade do Ferro.'
      },
      {
        id: 'c1p3-p6',
        page: 48,
        text: 'A necessidade de se cansar no trabalho da terra para se obter o alimento é também, para o homem, a de engendrar na mulher e por ela, de nascer e de morrer, de ter a cada dia angústia e ao mesmo tempo esperança de um amanhã incerto. A raça de ferro conhece uma existência ambígua e ambivalente. Zeus quis que, por ela, o bem e o mal sejam não apenas misturados, mas solidários, indissolúveis. É porque o homem se agrada dessa vida de miséria, do mesmo modo que ele envolve Pandora de amor, “um mal amável”, que a ironia dos deuses se apraz em lhe oferecer. Todos os sofrimentos que os homens de ferro suportam — fadigas, misérias, enfermidades, angústias —, Hesíodo indica claramente a sua origem: Pandora. Se a mulher não tivesse erguido a tampa do jarro em que estavam encerrados os males, os homens teriam continuado a viver, como antes, “ao abrigo dos sofrimentos, do labor penoso, das doenças dolorosas que trazem a morte”. Mas os males se dispersaram pelo mundo; entretanto, subsiste a Esperança, pois a vida não é totalmente sombria e os homens encontram ainda os bens misturados aos males.'
      },
      {
        id: 'c1p3-p7',
        page: 49,
        text: 'Dessa vida mesclada, plena de contrastes, Pandora aparece como símbolo e expressão. “Um belo mal, reverso de um bem”, define-a Hesíodo: terrível flagelo instalado em meio aos mortais, mas também maravilha (thâuma) paramentada pelos deuses de atrativo e de graça — raça maldita que o homem não pode suportar, mas da qual não pode também se privar —, elemento contrário e companheira do homem. Sob o seu aspecto dúplice de mulher e de terra, Pandora representa a função de fecundidade, tal como se manifesta, na Idade do Ferro, na produção do alimento e na reprodução da vida. Não é mais essa abundância espontânea que, na Idade do Ouro, fazia brotar do solo, só pela virtude da justa soberania, sem intervenção estranha, os seres vivos e seus alimentos: a partir de agora, é o homem que depõe a sua vida no seio da mulher, como é o agricultor que, ao trabalhar a terra, faz germinar nela os cereais. Toda riqueza adquirida deve ser paga com um esforço dispensado em contrapartida.'
      },
      {
        id: 'c1p3-p8',
        page: 50,
        text: 'Introduzido nesse universo ambíguo, o agricultor Hesíodo deve escolher entre duas atitudes que correspondem às duas Éris mencionadas no início do poema. A boa Luta é aquela que o incita ao trabalho, que o impede de não poupar o seu esforço a fim de aumentar os seus bens. Pressupõe que ele reconheceu e aceitou a dura lei sobre a qual repousa a vida na Idade do Ferro: não há felicidade, não há riqueza que não sejam pagas por um penoso esforço de labor. Para aquele cuja função é prover os alimentos, a Díke consiste em uma submissão completa a uma ordem que ele não criou e que se lhe impõe do exterior. Respeitar a Díke, para o agricultor, é dedicar a sua vida ao trabalho: torna-se então caro aos Imortais; o seu celeiro enche-se de trigo. Para ele, o bem suprime o mal.'
      },
      {
        id: 'c1p3-p9',
        page: 51,
        text: 'A outra luta é aquela que, desviando o agricultor do trabalho para o qual é destinado, incita-o a buscar a riqueza, não mais pelo labor, mas pela violência, pelo embuste e pela injustiça. Essa Éris “que gera a guerra e as disputas” representa a intervenção no mundo do agricultor de um princípio de Hýbris que se liga ao segundo plano, à função guerreira. Mas o agricultor em revolta contra a ordem à qual está submetido não se torna por isso um guerreiro. Sua Hýbris não é esse ardor frenético que anima e incita ao combate os Gigantes ou os homens de bronze. Mais próxima da Hýbris dos homens de prata, ela se define, de modo negativo, pela ausência de todos esses sentimentos “morais e religiosos” que regulamentam a vida dos homens, pela vontade dos deuses: não há afeição pelo hóspede, pelo amigo, pelo irmão; não há reconhecimento pelos pais; não há respeito pelo juramento, pelo justo, pelo bem.'
      },
      {
        id: 'c1p3-p10',
        page: 52,
        text: 'A análise minuciosa do mito vem assim confirmar e frisar em todos os aspectos o esquema que, desde o início, as grandes articulações do texto pareceram nos impor: não cinco raças se sucedendo cronologicamente segundo uma ordem de decadência mais ou menos progressiva, mas uma construção com três andares, cada um se dividindo em dois aspectos opostos e complementares. Essa arquitetura que regula o ciclo das idades é também aquela que preside ao ordenamento da sociedade humana e do mundo divino; o “passado”, tal como o compõe a estratificação das raças, estrutura-se sob o modelo de uma hierarquia intemporal de funções de valores.'
      },
      {
        id: 'c1p3-p11',
        page: 53,
        text: 'Cada par de idades acha-se, então, definido, não somente pela sua situação na série (as duas primeiras, as duas seguintes, as últimas), mas também por uma qualidade temporal particular, estreitamente associada ao tipo de atividade que lhe corresponde. Ouro e prata: são idades de vitalidade totalmente jovem; bronze e heróis: uma vida adulta, que ignora o jovem e o velho ao mesmo tempo; ferro: uma existência que se degrada ao longo de um tempo envelhecido e gasto.'
      },
      {
        id: 'c1p3-p12',
        page: 54,
        text: 'Quer se trate de uma filiação ou de uma invenção independente, esse esquema lembra, em suas linhas fundamentais, o sistema de tripartição funcional, cuja influência sobre o pensamento religioso dos indo-europeus, G. Dumézil revelou. O primeiro andar da construção mítica de Hesíodo define bem o plano da soberania no qual o rei exerce a sua atividade jurídico-religiosa; o segundo, o plano da função militar em que a violência brutal do guerreiro impõe uma dominação sem lei; o terceiro, aquele da fecundidade, dos alimentos necessários à vida, do qual se ocupa especialmente o agricultor.'
      },
      {
        id: 'c1p3-p13',
        page: 55,
        text: 'Essa estrutura tripartida forma o quadro no qual Hesíodo reinterpretou o mito das raças metálicas, e que lhe permitiu nela integrar, com uma perfeita coerência, o episódio dos heróis. Assim reestruturada, a própria narrativa integra-se em um conjunto mítico mais vasto, que ele menciona em cada uma de suas partes, por um jogo, ao mesmo tempo flexível e rigoroso, de correspondências em todos os níveis. Se a narrativa de Hesíodo ilustra, de modo particularmente feliz, esse sistema de multicorrespondência e de sobredeterminação simbólica que caracteriza a atividade mental no mito, ela comporta também um elemento novo. Com efeito, o tema se organiza segundo uma perspectiva claramente dicotômica, que domina a própria estrutura tripartida e separa todos os seus elementos em duas direções antagônicas. A lógica que orienta a arquitetura do mito, que nela articula os diversos planos, que regula o jogo das oposições e das afinidades, é a tensão entre Díke e Hýbris: ela não só ordena a construção do mito em seu conjunto, dando-lhe o seu significado geral, mas confere a cada um dos três níveis funcionais, no registro que lhe é próprio, um mesmo aspecto de polaridade.'
      },
      {
        id: 'c1p3-p14',
        page: 58,
        text: 'A narrativa das raças testemunha assim o que um pensamento mítico, como o de Hesíodo, pode comportar de rigorosamente elaborado e de inovador ao mesmo tempo. Hesíodo não somente reinterpreta o mito das raças metálicas no quadro de uma concepção trifuncional, mas transforma a própria estrutura tripartida e, desvalorizando a atividade guerreira, faz dela, na perspectiva religiosa que lhe é própria, não tanto um nível funcional entre outros, quanto a fonte do mal e do conflito no universo.'
      }
    ]
  }
];

export const CHAPTERS_INDEX: ChapterSummary[] = [
  {
    id: 'intro',
    number: 0,
    title: 'Introdução (A I. Meyerson)',
    sectionsCount: 1,
    parts: [
      { id: 'intro', title: 'Introdução Geral', pageRange: 'pp. 15–23' }
    ]
  },
  {
    id: 'cap1',
    number: 1,
    title: '1. Estruturas do mito',
    sectionsCount: 3,
    parts: [
      { id: 'cap1-part1', title: 'Parte 1: O mito hesiódico das raças (Ensaio estrutural - Seção A)', pageRange: 'pp. 27–35' },
      { id: 'cap1-part2', title: 'Parte 2: O mito hesiódico das raças (Ensaio estrutural - Seção B)', pageRange: 'pp. 36–45' },
      { id: 'cap1-part3', title: 'Parte 3: O mito hesiódico das raças (Ensaio estrutural - Seção C)', pageRange: 'pp. 46–59' },
    ]
  },
  {
    id: 'cap2',
    number: 2,
    title: '2. Aspectos míticos da memória e do tempo',
    sectionsCount: 2,
    parts: [
      { id: 'cap2-part1', title: 'Aspectos míticos da memória', pageRange: 'pp. 135–166' },
      { id: 'cap2-part2', title: 'O rio Améles e a meléte thanátou', pageRange: 'pp. 167–185' }
    ]
  },
  {
    id: 'cap3',
    number: 3,
    title: '3. A organização do espaço',
    sectionsCount: 4,
    parts: [
      { id: 'cap3-part1', title: 'Héstia-Hermes. Sobre a expressão religiosa do espaço e do movimento', pageRange: 'pp. 189–241' },
      { id: 'cap3-part2', title: 'Geometria e astronomia esférica na primeira cosmologia grega', pageRange: 'pp. 243–258' },
      { id: 'cap3-part3', title: 'Estrutura geométrica e noções políticas na cosmologia de Anaximandro', pageRange: 'pp. 259–283' },
      { id: 'cap3-part4', title: 'Espaço e organização política na Grécia antiga', pageRange: 'pp. 285–310' }
    ]
  },
  {
    id: 'cap4',
    number: 4,
    title: '4. O trabalho e o pensamento técnico',
    sectionsCount: 4,
    parts: [
      { id: 'cap4-part1', title: 'Prometeu e a função técnica', pageRange: 'pp. 313–324' },
      { id: 'cap4-part2', title: 'Trabalho e natureza na Grécia antiga', pageRange: 'pp. 325–348' },
      { id: 'cap4-part3', title: 'Aspectos psicológicos do trabalho na Grécia antiga', pageRange: 'pp. 349–356' },
      { id: 'cap4-part4', title: 'Observações sobre as formas e os limites do pensamento técnico', pageRange: 'pp. 357–380' }
    ]
  },
  {
    id: 'cap5',
    number: 5,
    title: '5. Do duplo à imagem',
    sectionsCount: 2,
    parts: [
      { id: 'cap5-part1', title: 'Figuração do invisível e categoria psicológica do “duplo”: o kolossós', pageRange: 'pp. 383–398' },
      { id: 'cap5-part2', title: 'Da presentificação do invisível à imitação da aparência', pageRange: 'pp. 399–415' }
    ]
  },
  {
    id: 'cap6',
    number: 6,
    title: '6. A pessoa na religião',
    sectionsCount: 1,
    parts: [
      { id: 'cap6-part1', title: 'Aspectos da pessoa na religião grega', pageRange: 'pp. 419–437' }
    ]
  },
  {
    id: 'cap7',
    number: 7,
    title: '7. Do mito à razão',
    sectionsCount: 2,
    parts: [
      { id: 'cap7-part1', title: 'A formação do pensamento positivo na Grécia arcaica', pageRange: 'pp. 441–474' },
      { id: 'cap7-part2', title: 'As origens da filosofia', pageRange: 'pp. 475–484' }
    ]
  }
];
