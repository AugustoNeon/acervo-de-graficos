/**
 * Funil de conversão de e-commerce — versão em D3.
 *
 * Mesma geometria do `output.png` (cada etapa é um trapézio: largura do topo
 * = valor da própria etapa, largura da base = valor da etapa seguinte),
 * desenhada aqui como um `<path>` por etapa em vez de `geom_polygon()`.
 *
 * Diferença deliberada em relação ao estático: aqui o rótulo é texto branco
 * direto sobre o preenchimento (não uma etiqueta com fundo branco) — no
 * `ggplot2`/dispositivo PNG deste ambiente, texto quase-branco sobre um
 * polígono ESTREITO sai com caracteres cortados (bug de renderização, não
 * falta de espaço; ver "Possíveis problemas pelo caminho" no README), mas
 * texto SVG num navegador de verdade não tem esse problema.
 *
 * O que a imagem não dá: passar o cursor mostra a contagem, o percentual do
 * total E a taxa de conversão em relação à etapa anterior.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Etapa {
  etapa: string;
  visitantes: number;
  fracao_do_total: number;
  conversao_etapa: number | null;
}

interface Dados {
  meta: { nota?: string };
  etapas: Etapa[];
  paleta: Record<string, string>;
}

const VB_W = 600;
const VB_H = 600;
const MARGEM_SUP = 20;
const MARGEM_INF = 20;

function pontosTrapezio(topo: number, base: number, yTopo: number, yBase: number): string {
  return [
    [-topo / 2, yTopo],
    [topo / 2, yTopo],
    [base / 2, yBase],
    [-base / 2, yBase],
  ]
    .map((p) => p.join(','))
    .join(' ');
}

const chart: VizChart = {
  aspectRatio: 1,
  label: 'Funil de conversão: 5 etapas de uma loja online fictícia, da visita à compra concluída.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, etapas, paleta } = data as Dados;
    const n = etapas.length;

    const maiorValor = etapas[0].visitantes;
    const escalaLargura = (VB_W - 80) / maiorValor;
    const alturaEtapa = (VB_H - MARGEM_SUP - MARGEM_INF) / n;

    const escalaTexto = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaTexto;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${-VB_W / 2} 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    interface Camada extends Etapa {
      topo: number;
      base: number;
      yTopo: number;
      yBase: number;
    }

    const camadas: Camada[] = etapas.map((e, i) => {
      const proxima = i < n - 1 ? etapas[i + 1].visitantes : e.visitantes;
      return {
        ...e,
        topo: e.visitantes * escalaLargura,
        base: proxima * escalaLargura,
        yTopo: MARGEM_SUP + i * alturaEtapa,
        yBase: MARGEM_SUP + (i + 1) * alturaEtapa,
      };
    });

    const grupo = svg.append('g');

    const etapasSel = grupo
      .selectAll<SVGPolygonElement, Camada>('polygon')
      .data(camadas)
      .join('polygon')
      .attr('points', (d) => pontosTrapezio(d.topo, d.base, d.yTopo, d.yBase))
      .attr('fill', (d) => paleta[d.etapa] ?? theme.accent)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(2))
      .attr('data-interactive', '');

    // Rotulo dentro de cada trapezio, na largura media da etapa -- some
    // abaixo de um limiar (etapa fica estreita demais pro nome caber) e
    // depende so do tooltip nesse caso, mesmo gate usado no resto do acervo
    // pra fatia/celula pequena demais (pizza, correlograma).
    const camadaTexto = svg.append('g').attr('text-anchor', 'middle').attr('pointer-events', 'none');
    const rotulos = camadaTexto
      .selectAll<SVGTextElement, Camada>('text')
      .data(camadas.filter((d) => (d.topo + d.base) / 2 > 130))
      .join('text')
      .attr('transform', (d) => `translate(0,${(d.yTopo + d.yBase) / 2 - 8})`)
      .attr('font-family', theme.fontBody)
      .attr('fill', theme.bg);

    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('font-size', px(13))
      .text((d) => d.etapa);
    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.5em')
      .attr('font-size', px(15))
      .attr('font-weight', 700)
      .text((d) => `${d.visitantes.toLocaleString('pt-BR')} · ${Math.round(d.fracao_do_total * 100)}%`);

    // -------------------------------------------------------------- interacao
    const conteudoTooltip = (d: Camada) => {
      const pctTotal = (d.fracao_do_total * 100).toFixed(1);
      const linhaConversao =
        d.conversao_etapa == null
          ? 'primeira etapa do funil'
          : `${(d.conversao_etapa * 100).toFixed(1)}% converteu vindo da etapa anterior`;
      return `<strong>${d.etapa}</strong><br>${d.visitantes.toLocaleString('pt-BR')} · ${pctTotal}% do total<br>${linhaConversao}`;
    };

    etapasSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      { selecao: etapasSel, chaveDe: (d) => d.etapa },
      (etapa) =>
        etapasSel
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('opacity', (d) => (d.etapa === etapa ? 1 : 0.45)),
      () => etapasSel.transition().duration(DURATION.fast).ease(EASE_STATE).attr('opacity', 1)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Cada etapa "cai" no lugar em sequencia, de cima pra baixo -- a leitura
    // natural de um funil (visitante entra pelo topo, escorre pras etapas
    // seguintes).
    if (animate) {
      etapasSel
        .attr('opacity', 0)
        .attr('transform', 'translate(0,-16)')
        .transition()
        .delay((_d, i) => stagger(i, n, 480))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1)
        .attr('transform', 'translate(0,0)');

      rotulos
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, n, 480) + DURATION.enter * 0.5)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + stagger(n - 1, n, 480) + 100, () => {
        etapasSel.interrupt().attr('opacity', 1).attr('transform', 'translate(0,0)');
        rotulos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
