/**
 * Sunburst zoomável — catálogo de streaming fictício (gênero > subgênero > título).
 *
 * Duas camadas de interatividade além do zoom:
 * 1. Clicar numa fatia reenquadra a árvore nela (transição de arco animada,
 *    técnica clássica de "zoomable sunburst"); clicar no centro volta um nível.
 * 2. Um seletor troca COMO as fatias são coloridas — por categoria (a cor
 *    "de fábrica", igual ao `output.png`), por profundidade (a estrutura da
 *    árvore em si, sem distinguir ramo) ou por valor (destaca os títulos
 *    mais assistidos, achatando o resto pra cinza). Os dois últimos modos só
 *    existem aqui — não têm equivalente na imagem estática.
 */

import { select, hierarchy, partition, arc as arcShape, interpolate, interpolateRgb, rgb as corRgb, type HierarchyRectangularNode } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  nome: string;
  cor: string;
  valor?: number;
  filhos?: No[];
}

interface Dados {
  meta: { nota?: string };
  arvore: No;
}

interface Retangulo {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type NoArco = HierarchyRectangularNode<No> & { current: Retangulo };

type Modo = 'categoria' | 'profundidade' | 'valor';
const MODOS: { id: Modo; rotulo: string }[] = [
  { id: 'categoria', rotulo: 'Por categoria' },
  { id: 'profundidade', rotulo: 'Por profundidade' },
  { id: 'valor', rotulo: 'Por valor' },
];

// Cores de DADO, de proposito fora do theme.ts (que so cobre a moldura do
// site — ver o comentario no topo daquele arquivo). --color-surface é quase
// branco (oklch, lightness ~0.965, pensado pra fundo de card, nao pra
// preencher 2/3 do raio de um sunburst) -- usa-lo aqui deixava o modo "por
// valor" com cara de gráfico quebrado/em branco.
const CINZA_NEUTRO = '#D8DCE2';
const CORES_PROFUNDIDADE = ['#BFD7FF', '#5B8DEF', '#1D3E82'];
const CORES_VALOR: [string, string] = ['#FFE9A8', '#C1121F'];

const VB = 640;
const RAIO = VB / 2 - 4;

function corTextoContraste(cor: string): string {
  const c = corRgb(cor);
  const luminancia = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return luminancia > 150 ? '#1a1f24' : '#ffffff';
}

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Sunburst zoomável do catálogo de um serviço de streaming fictício, organizado por gênero, subgênero e título — ' +
    'clique numa fatia pra ampliar, clique no centro pra voltar, e troque o modo de cor pelo seletor acima do gráfico.',

  draw({ root: hostEl, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, arvore } = data as Dados;

    const escalaPx = VB / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const raizHierarquia = hierarchy<No>(arvore, (d) => d.filhos)
      .sum((d) => d.valor ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const raiz = partition<No>().size([2 * Math.PI, raizHierarquia.height + 1])(raizHierarquia) as HierarchyRectangularNode<No>;
    const nos = raiz.descendants().filter((d) => d.depth > 0) as NoArco[];
    nos.forEach((d) => (d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }));
    const raizArco = raiz as NoArco;
    raizArco.current = { x0: raiz.x0, x1: raiz.x1, y0: raiz.y0, y1: raiz.y1 };

    const passoRaio = RAIO / (raizHierarquia.height + 1);

    const arco = arcShape<Retangulo>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.004))
      .padRadius(RAIO * 1.5)
      .innerRadius((d) => d.y0 * passoRaio)
      .outerRadius((d) => Math.max(d.y0 * passoRaio, d.y1 * passoRaio - 1));

    // O limite superior de `y1` NUNCA pode ser um número fixo (ex: "3",
    // copiado sem pensar do exemplo de referência, que por acaso tinha uma
    // arvore mais rasa) -- essa arvore tem altura 3 (raiz > genero >
    // subgenero > titulo), entao o anel mais externo (titulo) chega a `y1=4`
    // quando vista da raiz, e um teto de "3" escondia o anel inteiro sem
    // erro nenhum. Ancestrais/irmãos fora do foco já saem com x0==x1 ou
    // y0==y1 (achatados a zero pelo clamp em `alvoDe`), entao nao precisa de
    // teto nenhum alem disso pra escondê-los.
    const arcoVisivel = (d: Retangulo) => d.y1 > d.y0 && d.y0 >= 0 && d.x1 > d.x0;
    const rotuloVisivel = (d: Retangulo) => arcoVisivel(d) && d.y0 >= 1 && d.x1 - d.x0 > 0.07;
    const opacidadeAlvo = (d: NoArco) => (d.children ? 0.85 : 0.7);

    // Alvo (relativo ao foco atual) pra um nó — mesma fórmula pro estado
    // inicial, pro clique de zoom e pra transição de entrada. Usa SEMPRE as
    // coordenadas absolutas e permanentes do `d3.partition()` (`d.x0`/`d.y0`,
    // nunca mudam depois de calculadas) dos dois lados da conta — nunca
    // misturar com `.current` aqui: `.current` é só o estado JÁ DESENHADO
    // (pra saber de onde animar), e misturar as duas bases quebra o zoom a
    // partir do segundo clique (bug real, pego comparando com o algoritmo de
    // referência depois que o zoom pareceu "errado" em profundidade >= 2).
    function alvoDe(d: HierarchyRectangularNode<No>, foco: HierarchyRectangularNode<No>): Retangulo {
      return {
        x0: Math.max(0, Math.min(1, (d.x0 - foco.x0) / (foco.x1 - foco.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - foco.x0) / (foco.x1 - foco.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - foco.depth),
        y1: Math.max(0, d.y1 - foco.depth),
      };
    }

    let modoAtual: Modo = 'categoria';
    const maxValor = Math.max(...nos.filter((d) => !d.children).map((d) => d.value ?? 0));

    function corDoNo(d: NoArco): string {
      if (modoAtual === 'profundidade') return CORES_PROFUNDIDADE[Math.min(d.depth - 1, CORES_PROFUNDIDADE.length - 1)] ?? CINZA_NEUTRO;
      if (modoAtual === 'valor') {
        if (d.children) return CINZA_NEUTRO;
        return interpolateRgb(CORES_VALOR[0], CORES_VALOR[1])((d.value ?? 0) / maxValor);
      }
      return d.data.cor || CINZA_NEUTRO;
    }

    const svg = select(hostEl).append('svg').attr('viewBox', `0 0 ${VB} ${VB}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2})`);

    const path = g
      .append('g')
      .selectAll<SVGPathElement, NoArco>('path')
      .data(nos)
      .join('path')
      .attr('data-interactive', '')
      .attr('fill', (d) => corDoNo(d))
      .attr('fill-opacity', (d) => (arcoVisivel(d.current) ? opacidadeAlvo(d) : 0))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1))
      .attr('d', (d) => arco(d.current) ?? '')
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'));

    // ------------------------------------------------------------- rótulos
    // Mesma técnica de rotação usada no circular-barplot deste acervo: gira
    // até o ângulo médio da fatia, empurra pro raio médio, e vira de cabeça
    // pra cima quando cai na metade esquerda do círculo.
    function transformRotulo(d: Retangulo): string {
      const anguloGraus = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
      const raioMedio = ((d.y0 + d.y1) / 2) * passoRaio;
      return `rotate(${anguloGraus - 90}) translate(${raioMedio},0) rotate(${anguloGraus < 180 ? 0 : 180})`;
    }

    const rotulos = g
      .append('g')
      .attr('pointer-events', 'none')
      .selectAll<SVGTextElement, NoArco>('text')
      .data(nos)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', (d) => (d.depth === 1 ? 700 : 500))
      .attr('font-size', (d) => px(d.depth === 1 ? 12 : 10))
      .attr('fill', (d) => corTextoContraste(corDoNo(d)))
      .attr('fill-opacity', (d) => (rotuloVisivel(d.current) ? 1 : 0))
      .attr('transform', (d) => transformRotulo(d.current))
      .text((d) => d.data.nome);

    // ---------------------------------------------------------- centro/label
    const centro = g
      .append('circle')
      .attr('r', passoRaio)
      .attr('fill', theme.bg)
      .attr('data-interactive', '')
      .style('cursor', 'pointer');

    const rotuloCentro = g
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('fill', theme.ink)
      // Sem isso, clicar em cima do texto (irmao do circulo, nao filho) nunca
      // chega no listener do circulo -- cliques no meio do rotulo pareceriam
      // simplesmente nao fazer nada (bug real, pego so testando de verdade).
      .attr('pointer-events', 'none');
    const linha1 = rotuloCentro.append('tspan').attr('x', 0).attr('y', -px(2)).attr('font-size', px(13));
    const linha2 = rotuloCentro
      .append('tspan')
      .attr('x', 0)
      .attr('y', px(14))
      .attr('font-size', px(10.5))
      .attr('fill', theme.inkMuted)
      .attr('font-weight', 400);

    function atualizarCentro(d: NoArco) {
      linha1.text(d.depth === 0 ? 'catálogo' : d.data.nome);
      const total = raiz.value ?? 1;
      linha2.text(d.depth === 0 ? `${total.toLocaleString('pt-BR')} h no total` : `${Math.round(((d.value ?? 0) / total) * 100)}% do catálogo`);
    }
    atualizarCentro(raizArco);

    // ------------------------------------------------------------- tooltip
    function tooltipDe(d: NoArco): string {
      const pai = d.parent && d.parent.depth > 0 ? d.parent.value ?? 1 : raiz.value ?? 1;
      const pct = Math.round(((d.value ?? 0) / pai) * 100);
      const caminho = d
        .ancestors()
        .reverse()
        .slice(1)
        .map((n) => n.data.nome)
        .join(' › ');
      return `<strong>${d.data.nome}</strong><br>${caminho || d.data.nome}<br>${(d.value ?? 0).toLocaleString('pt-BR')} h · ${pct}% do nível acima`;
    }

    path
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipDe(d), evento))
      .on('pointerleave', () => tooltip.hide());

    // --------------------------------------------------------------- clique
    let foco: NoArco = raizArco;

    function clicar(alvoClicado: NoArco) {
      const novoFoco = alvoClicado === foco ? ((alvoClicado.parent as NoArco) ?? raizArco) : alvoClicado;
      if (!novoFoco || novoFoco === foco) return;

      // Um interpolador por nó, criado ANTES de qualquer mutação — captura o
      // retângulo atual (ponto de partida) e o alvo (ponto de chegada) como
      // valores fechados no closure. Reaproveitado pelo path E pelo rótulo,
      // assim os dois seguem exatamente a mesma trajetória quadro a quadro.
      // (Bug corrigido aqui: a versão anterior sobrescrevia `current` pro
      // valor final ANTES de montar o interpolador, fazendo antigo==alvo e a
      // transição "pular" direto pro fim em vez de animar.)
      const interpoladores = new Map<NoArco, (t: number) => Retangulo>();
      nos.forEach((d) => {
        const alvo = alvoDe(d, novoFoco);
        interpoladores.set(d, interpolate(d.current, alvo) as (t: number) => Retangulo);
      });

      foco = novoFoco;
      atualizarCentro(foco);
      nos.forEach((d) => (d.current = interpoladores.get(d)!(1)));

      path
        .transition()
        .duration(DURATION.slow)
        .ease(EASE_STATE)
        .attrTween('d', (d) => {
          const interp = interpoladores.get(d)!;
          return (time: number) => arco(interp(time)) ?? '';
        })
        .attr('fill-opacity', (d) => (arcoVisivel(d.current) ? opacidadeAlvo(d) : 0))
        .style('cursor', (d) => (d.children && arcoVisivel(d.current) ? 'pointer' : 'default'));

      rotulos
        .transition()
        .duration(DURATION.slow)
        .ease(EASE_STATE)
        .attrTween('transform', (d) => {
          const interp = interpoladores.get(d)!;
          return (time: number) => transformRotulo(interp(time));
        })
        .attr('fill-opacity', (d) => (rotuloVisivel(d.current) ? 1 : 0));
    }

    path.on('click', (_e, d) => clicar(d));
    centro.on('click', () => clicar((foco.parent as NoArco) ?? raizArco));

    // ------------------------------------------------------- seletor de cor
    const controles = select(hostEl).append('div').attr('class', 'viz-controles');
    const botoesModo = controles
      .selectAll('button')
      .data(MODOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === modoAtual))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === modoAtual) return;
        modoAtual = m.id;
        botoesModo.attr('aria-pressed', (mm) => String(mm.id === modoAtual));
        path.transition().duration(DURATION.base).attr('fill', (d) => corDoNo(d));
        rotulos.transition().duration(DURATION.base).attr('fill', (d) => corTextoContraste(corDoNo(d)));
      });

    if (meta.nota) {
      select(hostEl).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      const colapsado = (d: NoArco): Retangulo => ({ x0: (d.current.x0 + d.current.x1) / 2, x1: (d.current.x0 + d.current.x1) / 2, y0: d.current.y0, y1: d.current.y1 });

      path.attr('d', (d) => arco(colapsado(d)) ?? '');
      rotulos.attr('fill-opacity', 0);

      path
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (d) => {
          const i = interpolate(colapsado(d), d.current);
          return (time: number) => arco(i(time)) ?? '';
        });

      rotulos
        .transition()
        .delay(DURATION.enter * 0.6)
        .duration(DURATION.base)
        .attr('fill-opacity', (d) => (rotuloVisivel(d.current) ? 1 : 0));

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        path.interrupt().attr('d', (d) => arco(d.current) ?? '');
        rotulos.interrupt().attr('fill-opacity', (d) => (rotuloVisivel(d.current) ? 1 : 0));
      });
    }
  },
};

export default chart;
