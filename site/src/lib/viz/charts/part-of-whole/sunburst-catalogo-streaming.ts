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

import { select, hierarchy, partition, arc as arcShape, interpolate, interpolateRgb, type HierarchyRectangularNode } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal } from '../../motion';
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

type NoArco = HierarchyRectangularNode<No> & { current?: { x0: number; x1: number; y0: number; y1: number } };

type Modo = 'categoria' | 'profundidade' | 'valor';
const MODOS: { id: Modo; rotulo: string }[] = [
  { id: 'categoria', rotulo: 'Por categoria' },
  { id: 'profundidade', rotulo: 'Por profundidade' },
  { id: 'valor', rotulo: 'Por valor' },
];

const CORES_PROFUNDIDADE = ['#BFD7FF', '#5B8DEF', '#1D3E82'];
const CORES_VALOR: [string, string] = ['#FFE9A8', '#C1121F'];

const VB = 640;
const RAIO = VB / 2 - 4;

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

    const raiz = partition<No>().size([2 * Math.PI, raizHierarquia.height + 1])(raizHierarquia) as NoArco;
    raiz.each((d) => (d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }));

    const passoRaio = RAIO / (raizHierarquia.height + 1);

    const arco = arcShape<{ x0: number; x1: number; y0: number; y1: number }>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.004))
      .padRadius(RAIO * 1.5)
      .innerRadius((d) => d.y0 * passoRaio)
      .outerRadius((d) => Math.max(d.y0 * passoRaio, d.y1 * passoRaio - 1));

    const visivel = (d: { x0: number; x1: number; y0: number; y1: number }) => d.y1 <= 3 && d.y0 >= 0 && d.x1 > d.x0;
    const opacidadeAlvo = (d: NoArco) => (d.children ? 0.85 : 0.7);

    let modoAtual: Modo = 'categoria';
    const maxValor = Math.max(...raiz.descendants().filter((d) => !d.children).map((d) => d.value ?? 0));

    function corDoNo(d: NoArco): string {
      if (modoAtual === 'profundidade') return CORES_PROFUNDIDADE[Math.min(d.depth - 1, CORES_PROFUNDIDADE.length - 1)] ?? theme.accent;
      if (modoAtual === 'valor') {
        if (d.children) return theme.surface;
        return interpolateRgb(CORES_VALOR[0], CORES_VALOR[1])((d.value ?? 0) / maxValor);
      }
      return d.data.cor || theme.accent;
    }

    const svg = select(hostEl).append('svg').attr('viewBox', `0 0 ${VB} ${VB}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2})`);

    const nos = raiz.descendants().filter((d) => d.depth > 0) as NoArco[];

    const path = g
      .append('g')
      .selectAll<SVGPathElement, NoArco>('path')
      .data(nos)
      .join('path')
      .attr('data-interactive', '')
      .attr('fill', (d) => corDoNo(d))
      .attr('fill-opacity', (d) => (visivel(d.current!) ? opacidadeAlvo(d) : 0))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1))
      .attr('d', (d) => arco(d.current!) ?? '')
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'));

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
      // simplesmente nao fazer nada.
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
    atualizarCentro(raiz);

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
    let foco: NoArco = raiz;

    function clicar(alvo: NoArco) {
      const novoFoco = alvo === foco ? (alvo.parent as NoArco) ?? raiz : alvo;
      if (!novoFoco || novoFoco === foco) return;
      foco = novoFoco;
      atualizarCentro(foco);

      raiz.each((d) => {
        (d as NoArco).current = {
          x0: Math.max(0, Math.min(1, (d.x0 - foco.x0) / (foco.x1 - foco.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - foco.x0) / (foco.x1 - foco.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - foco.depth),
          y1: Math.max(0, d.y1 - foco.depth),
        };
      });

      const t = g.transition().duration(DURATION.slow);
      path
        .transition(t as never)
        .tween('arcotween', (d) => {
          const antigo = { ...(d as NoArco).current! };
          const alvoPos = (d as NoArco).current!;
          const i = interpolate(antigo, alvoPos);
          return (time: number) => {
            (d as NoArco).current = i(time);
          };
        })
        .attrTween('d', (d) => () => arco((d as NoArco).current!) ?? '')
        .attr('fill-opacity', (d) => (visivel((d as NoArco).current!) ? opacidadeAlvo(d as NoArco) : 0))
        .style('cursor', (d) => ((d as NoArco).children && visivel((d as NoArco).current!) ? 'pointer' : 'default'));
    }

    path.on('click', (_e, d) => clicar(d));
    centro.on('click', () => clicar((raiz.descendants().find((d) => d === foco.parent) as NoArco) ?? raiz));

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
        path.transition().duration(DURATION.base).attr('fill', (d) => corDoNo(d as NoArco));
      });

    if (meta.nota) {
      select(hostEl).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      path.attr('d', () => arco({ x0: 0, x1: 0, y0: 0, y1: 3 }) ?? '');
      path
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (d) => {
          const alvo = (d as NoArco).current!;
          const i = interpolate({ x0: (alvo.x0 + alvo.x1) / 2, x1: (alvo.x0 + alvo.x1) / 2, y0: alvo.y0, y1: alvo.y1 }, alvo);
          return (time: number) => arco(i(time)) ?? '';
        });

      garantirEstadoFinal(DURATION.enter + 250, () => {
        path.interrupt().attr('d', (d) => arco((d as NoArco).current!) ?? '');
      });
    }
  },
};

export default chart;
