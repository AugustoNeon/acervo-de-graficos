/**
 * Circular barplot empilhado — versao interativa.
 *
 * Reproduz o output.png (mesma grade, mesmos rotulos de filial rotacionados,
 * mesmos arcos de regiao, mesma paleta) e acrescenta o que a imagem nao da:
 * entrada animada, realce por filial e realce por linha de produto.
 *
 * Toda a geometria vem do data.json gerado pelo script.R -- posicao de cada
 * barra, extensao de cada regiao, arcos de grade. Aqui so se desenha.
 */

import { select, arc, scaleLinear } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Dados {
  meta: {
    nBarras: number;
    yMin: number;
    yMax: number;
    grade: number[];
    yLinhaRegiao: number;
    yRotuloRegiao: number;
    paleta: Record<string, string>;
    /** De baixo pra cima na pilha */
    ordem: string[];
    rotulos: Record<string, string>;
  };
  barras: { id: number; filial: string; regiao: string; total: number }[];
  segmentos: { id: number; categoria: string; receita: number }[];
  regioes: { regiao: string; inicio: number; fim: number; centro: number }[];
  arcosGrade: { inicio: number; fim: number }[];
}

/** Fatia ja resolvida em geometria: qual barra, que cor, de que raio a que raio. */
interface Fatia {
  id: number;
  categoria: string;
  ri: number;
  ro: number;
}

/** Lado do viewBox. O SVG e sempre desenhado nesta escala e reescala via CSS. */
const VB = 900;
/** Largura da barra dentro da fatia angular que lhe cabe — o 0.9 do geom_bar. */
const LARGURA_BARRA = 0.9;
/** Opacidade das barras — o mesmo alpha = 0.85 do geom_bar. */
const OPACIDADE_BARRA = 0.85;
/** Quanto um elemento fora de foco perde de presenca. */
const OPACIDADE_APAGADA = 0.16;
const OPACIDADE_ROTULO = 0.75;

const RAD = Math.PI / 180;

/** Alvo de realce: uma filial, uma linha de produto, ou nada (estado neutro). */
type Foco = { id: number } | { categoria: string } | null;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Gráfico de barras empilhadas em disposição circular: receita mensal de 32 filiais de livraria, ' +
    'agrupadas em quatro regiões e divididas em três linhas de produto.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, barras, segmentos, regioes, arcosGrade } = data as Dados;
    const { nBarras, yMin, yMax, paleta, ordem, rotulos } = meta;

    // O SVG e reescalado pelo CSS, entao um "px" dentro do viewBox nao e um px
    // na tela. Converter na direcao contraria mantem o texto do mesmo tamanho
    // real em qualquer largura -- sem isso os rotulos viram fiapo no celular.
    const escala = VB / Math.max(width, 1);
    const px = (valor: number) => valor * escala;

    const maxTotal = Math.max(...barras.map((b) => b.total));
    // Maior raio que ainda deixa o rotulo mais longo caber dentro do viewBox.
    const fracaoRotulo = (maxTotal + 6 - yMin) / (yMax - yMin);
    const R = (VB / 2 - px(58)) / fracaoRotulo;

    const raio = scaleLinear().domain([yMin, yMax]).range([0, R]);
    /** Angulo (graus, a partir das 12h, sentido horario) do centro da posicao p. */
    const angulo = (p: number) => (360 * (p - 0.5)) / nBarras;
    /** Coordenada polar -> cartesiana, RELATIVA ao centro (ver o <g> abaixo). */
    const ponto = (p: number, y: number): [number, number] => {
      const t = angulo(p) * RAD;
      return [raio(y) * Math.sin(t), -raio(y) * Math.cos(t)];
    };

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB} ${VB}`)
      // A informacao ja esta no aria-label do container e na tabela de dados
      // da pagina; o SVG em si so repetiria numero solto.
      .attr('aria-hidden', 'true');

    // d3.arc() sempre gera o path em volta da origem, entao a origem precisa
    // ser o centro do circulo. Todo o desenho vive dentro deste <g>, e por
    // isso `ponto()` devolve coordenada relativa ao centro, nao absoluta.
    const raiz = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2})`);

    // Ordem de pintura: grade por baixo, barras no meio, texto por cima.
    const camadaGrade = raiz.append('g');
    const camadaBarras = raiz.append('g');
    const camadaTexto = raiz.append('g');

    // ----------------------------------------------------------------- grade
    // Arcos de escala, desenhados so nos vaos entre regioes -- cruzando as
    // barras eles atrapalhariam a leitura da altura empilhada.
    const arcoGrade = arc<{ inicio: number; fim: number; y: number }>()
      .innerRadius((d) => raio(d.y))
      .outerRadius((d) => raio(d.y))
      .startAngle((d) => angulo(d.fim) * RAD)
      .endAngle((d) => angulo(d.inicio) * RAD);

    camadaGrade
      .selectAll('path')
      .data(meta.grade.flatMap((y) => arcosGrade.map((a) => ({ ...a, y }))))
      .join('path')
      .attr('d', arcoGrade)
      .attr('fill', 'none')
      .attr('stroke', theme.border)
      .attr('stroke-width', px(1));

    // Numeros da escala, na mesma posicao do estatico: no ultimo vao, logo
    // antes de o circulo fechar.
    camadaTexto
      .selectAll('text.escala')
      .data(meta.grade)
      .join('text')
      .attr('class', 'escala')
      .attr('x', (y) => ponto(nBarras, y)[0])
      .attr('y', (y) => ponto(nBarras, y)[1])
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(13))
      .attr('fill', theme.inkMuted)
      .text((y) => String(y));

    // ---------------------------------------------------------------- barras
    const valoresPorId = new Map<number, Map<string, number>>();
    for (const s of segmentos) {
      if (!valoresPorId.has(s.id)) valoresPorId.set(s.id, new Map());
      valoresPorId.get(s.id)!.set(s.categoria, s.receita);
    }

    // Empilhamento acumulado por filial, de baixo pra cima, ja convertido em raio.
    const fatias: Fatia[] = [];
    for (const barra of barras) {
      const valores = valoresPorId.get(barra.id);
      if (!valores) continue;
      let acumulado = 0;
      for (const categoria of ordem) {
        const valor = valores.get(categoria) ?? 0;
        fatias.push({
          id: barra.id,
          categoria,
          ri: raio(acumulado),
          ro: raio(acumulado + valor),
        });
        acumulado += valor;
      }
    }

    const meiaLargura = ((360 / nBarras) * LARGURA_BARRA) / 2;
    const arcoBarra = arc<Fatia>()
      .innerRadius((d) => d.ri)
      .outerRadius((d) => d.ro)
      .startAngle((d) => (angulo(d.id) - meiaLargura) * RAD)
      .endAngle((d) => (angulo(d.id) + meiaLargura) * RAD);

    const barraPorId = new Map(barras.map((b) => [b.id, b]));

    const paths = camadaBarras
      .selectAll<SVGPathElement, Fatia>('path')
      .data(fatias)
      .join('path')
      .attr('d', arcoBarra)
      .attr('fill', (d) => paleta[d.categoria])
      .attr('fill-opacity', OPACIDADE_BARRA)
      .attr('data-interactive', '');

    // --------------------------------------------------------------- rotulos
    // Nome da filial no topo da sua barra, acompanhando o raio. Na metade
    // esquerda do circulo o texto sairia de cabeca pra baixo, entao gira 180 e
    // ancora do outro lado -- mesma correcao do estatico.
    const rotulosFilial = camadaTexto
      .selectAll<SVGTextElement, (typeof barras)[number]>('text.filial')
      .data(barras)
      .join('text')
      .attr('class', 'filial')
      .attr('transform', (d) => {
        const [x, y] = ponto(d.id, d.total + 6);
        const g = angulo(d.id);
        return `translate(${x},${y}) rotate(${g > 180 ? g + 90 : g - 90})`;
      })
      .attr('text-anchor', (d) => (angulo(d.id) > 180 ? 'end' : 'start'))
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .attr('font-weight', 600)
      .attr('fill', theme.ink)
      .attr('fill-opacity', OPACIDADE_ROTULO)
      .text((d) => d.filial);

    // --------------------------------------------------------------- regioes
    const arcoRegiao = arc<{ inicio: number; fim: number }>()
      .innerRadius(raio(meta.yLinhaRegiao))
      .outerRadius(raio(meta.yLinhaRegiao))
      .startAngle((d) => angulo(d.inicio) * RAD)
      .endAngle((d) => angulo(d.fim) * RAD);

    camadaTexto
      .selectAll('path.regiao')
      .data(regioes)
      .join('path')
      .attr('class', 'regiao')
      .attr('d', arcoRegiao)
      .attr('fill', 'none')
      .attr('stroke', theme.ink)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', px(1.6))
      .attr('stroke-linecap', 'round');

    camadaTexto
      .selectAll('text.regiao')
      .data(regioes)
      .join('text')
      .attr('class', 'regiao')
      .attr('x', (d) => ponto(d.centro, meta.yRotuloRegiao)[0])
      .attr('y', (d) => ponto(d.centro, meta.yRotuloRegiao)[1])
      // Os nomes ficam DENTRO do circulo, entao "pra fora" e o lado oposto ao
      // dos rotulos de filial.
      .attr('text-anchor', (d) => (angulo(d.centro) < 180 ? 'end' : 'start'))
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(14))
      .attr('font-weight', 600)
      .attr('fill', theme.ink)
      .text((d) => d.regiao);

    // -------------------------------------------------------------- interacao
    const combina = (foco: Foco, fatia: Fatia) => {
      if (!foco) return true;
      if ('id' in foco) return fatia.id === foco.id;
      return fatia.categoria === foco.categoria;
    };

    const realcar = (foco: Foco) => {
      paths
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) =>
          combina(foco, d) ? OPACIDADE_BARRA : OPACIDADE_APAGADA
        );

      // Rotulo de filial so reage ao realce por filial: apagar os 32 nomes
      // quando o foco e uma linha de produto seria perder a referencia de quem
      // e quem justamente na hora de comparar.
      const focoId = foco && 'id' in foco ? foco.id : null;
      rotulosFilial
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) =>
          focoId === null ? OPACIDADE_ROTULO : d.id === focoId ? 1 : 0.2
        );
    };

    const conteudoTooltip = (id: number) => {
      const barra = barraPorId.get(id)!;
      const valores = valoresPorId.get(id)!;
      const linhas = ordem
        .slice()
        .reverse()
        .map(
          (c) =>
            `<span class="viz-swatch" style="background:${paleta[c]}"></span>` +
            `${rotulos[c]} <strong>${valores.get(c)}</strong>`
        )
        .join('<br>');
      return (
        `<strong>${barra.filial}</strong> · ${barra.regiao}<br>${linhas}` +
        `<br>Total <strong>${barra.total}</strong> mil`
      );
    };

    let htmlAtual = '';
    paths
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar({ id: d.id });
        htmlAtual = conteudoTooltip(d.id);
        tooltip.show(htmlAtual, evento);
      })
      // Reposiciona sem remontar o HTML a cada pixel de movimento.
      .on('pointermove', (evento: PointerEvent) => tooltip.show(htmlAtual, evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    // --------------------------------------------------------------- legenda
    // Em HTML, fora do SVG: texto dentro de um viewBox que cresce com o dado
    // encolhe junto e vira ilegivel. Serve tambem de controle -- e o caminho
    // de teclado pra comparar uma linha de produto entre todas as filiais.
    select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(ordem.slice().reverse())
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html(
        (c) => `<span class="viz-swatch" style="background:${paleta[c]}"></span>${rotulos[c]}`
      )
      .on('pointerenter', (_e, c) => realcar({ categoria: c }))
      .on('pointerleave', () => realcar(null))
      .on('focus', (_e, c) => realcar({ categoria: c }))
      .on('blur', () => realcar(null));

    // --------------------------------------------------------------- entrada
    // As barras crescem do centro pra fora, escalonadas no sentido do circulo:
    // o desenho se monta na mesma ordem em que se le.
    if (animate) {
      const base = raio(0);
      paths
        .attr('d', (d) => arcoBarra({ ...d, ri: base, ro: base }))
        .transition()
        .delay((_d, i) => stagger(Math.floor(i / ordem.length), barras.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (d) => (t) =>
          arcoBarra({
            ...d,
            ri: base + (d.ri - base) * t,
            ro: base + (d.ro - base) * t,
          })!
        );

      camadaTexto
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.45)
        .duration(DURATION.base)
        .attr('opacity', 1);
    }
  },
};

export default chart;
