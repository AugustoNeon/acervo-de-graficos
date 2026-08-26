/**
 * UpSet plot — combinações de conjuntos, com leitura cruzada nos dois sentidos.
 *
 * Os três painéis da imagem estática (tamanho de cada combinação em cima,
 * total por conjunto à esquerda, matriz de pontos ligando as duas coisas) são
 * desenhados aqui num SVG só. Isso resolve o alinhamento entre eles por
 * construção — no R ele depende do `patchwork` casar as áreas de painel; aqui
 * as três regiões dividem as mesmas escalas.
 *
 * O que a versão interativa acrescenta é justamente o que a matriz de pontos
 * pede e a imagem estática não entrega: percorrer a relação nos DOIS sentidos.
 * Da combinação para os meios (passar numa coluna acende os meios que ela
 * reúne, inclusive nas barras de total) e do meio para as combinações (passar
 * num meio acende todas as colunas que o incluem). Sem isso, responder "quais
 * combinações incluem metrô?" exige varrer uma linha da matriz com o dedo.
 */

import { select, scaleBand, scaleLinear, axisBottom, axisLeft, format, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Intersecao {
  id: string;
  rotulo: string;
  tamanho: number;
  grau: number;
  membros: string[];
}

interface Dados {
  meta: {
    conjuntos: string[];
    totais: Record<string, number>;
    respondentes: number;
    paleta: { intersecao: string; conjunto: string; vazio: string };
    nota?: string;
  };
  intersecoes: Intersecao[];
}

type OrdemId = 'tamanho' | 'grau' | 'meio';

const ORDENS: { id: OrdemId; rotulo: string }[] = [
  { id: 'tamanho', rotulo: 'Tamanho' },
  { id: 'grau', rotulo: 'Nº de meios' },
  { id: 'meio', rotulo: 'Meio principal' },
];

const VB_W = 1000;
const VB_H = 640;
const MARGEM = { topo: 22, dir: 24, baixo: 52, esq: 18 };

/** Largura reservada às barras de total e aos nomes dos conjuntos. */
const LARGURA_TOTAIS = 190;
const LARGURA_ROTULOS = 118;
/** Altura do painel de cima (tamanho de cada combinação). */
const ALTURA_TOPO = 262;
/** Respiro entre o painel de cima e a matriz de pontos. */
const VAO = 26;

const fmtMil = format(',d');
const comPontos = (v: number) => fmtMil(v).replace(/,/g, '.');

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'UpSet plot das combinações de meios de transporte usados na semana: barras com o tamanho de cada ' +
    'combinação, matriz de pontos indicando quais meios cada uma reúne e barras com o total por meio.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, intersecoes } = data as Dados;
    const { conjuntos, totais, paleta } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const xMatriz = MARGEM.esq + LARGURA_TOTAIS + LARGURA_ROTULOS;
    const larguraMatriz = VB_W - MARGEM.dir - xMatriz;
    const yTopoMatriz = MARGEM.topo + ALTURA_TOPO + VAO;
    const alturaMatriz = VB_H - MARGEM.baixo - yTopoMatriz;

    const maxTamanho = Math.max(...intersecoes.map((i) => i.tamanho));
    const maxTotal = Math.max(...conjuntos.map((c) => totais[c]));

    const xInter = scaleBand<string>()
      .domain(intersecoes.map((i) => i.id))
      .range([xMatriz, xMatriz + larguraMatriz])
      .padding(0.34);
    const yTamanho = scaleLinear().domain([0, maxTamanho * 1.12]).range([MARGEM.topo + ALTURA_TOPO, MARGEM.topo]);
    const yConjunto = scaleBand<string>().domain(conjuntos).range([yTopoMatriz, yTopoMatriz + alturaMatriz]).padding(0.3);
    // Cresce da direita pra esquerda: o eixo é espelhado, como na imagem
    // estática, pra que a barra de cada meio encoste no nome dele.
    const xTotal = scaleLinear()
      .domain([0, maxTotal * 1.05])
      .range([MARGEM.esq + LARGURA_TOTAIS, MARGEM.esq]);

    const centroCol = (id: string) => (xInter(id) ?? 0) + xInter.bandwidth() / 2;
    const centroLinha = (c: string) => (yConjunto(c) ?? 0) + yConjunto.bandwidth() / 2;
    const raioPonto = Math.min(9, yConjunto.bandwidth() / 2.6);

    function ordenar(id: OrdemId): string[] {
      const copia = [...intersecoes];
      if (id === 'tamanho') copia.sort((a, b) => b.tamanho - a.tamanho);
      else if (id === 'grau') copia.sort((a, b) => a.grau - b.grau || b.tamanho - a.tamanho);
      else {
        // "Meio principal": agrupa pelo membro de maior total (os conjuntos já
        // vêm ordenados assim do R) e, dentro do grupo, por tamanho. Deixa
        // visível de uma vez quantas combinações cada meio participa.
        const posicao = (i: Intersecao) => Math.min(...i.membros.map((m) => conjuntos.indexOf(m)));
        copia.sort((a, b) => posicao(a) - posicao(b) || b.tamanho - a.tamanho);
      }
      return copia.map((i) => i.id);
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');

    // Cada grupo é nomeado: além de deixar o DOM legível na inspeção, é o que
    // permite medir uma camada específica sem depender da ordem de anexação.
    const gGradeTopo = svg.append('g').attr('class', 'grade-topo');
    const gEixoTopo = svg.append('g').attr('class', 'eixo-topo').attr('transform', `translate(${xMatriz},0)`);
    const gEixoTotais = svg
      .append('g')
      .attr('class', 'eixo-totais')
      .attr('transform', `translate(0,${yTopoMatriz + alturaMatriz})`);
    const gFaixas = svg.append('g').attr('class', 'faixas');
    const gBarrasTopo = svg.append('g').attr('class', 'barras-topo');
    const gValoresTopo = svg.append('g').attr('class', 'valores-topo');
    const gBarrasTotais = svg.append('g').attr('class', 'barras-totais');
    const gRotulos = svg.append('g').attr('class', 'rotulos');
    const gVazios = svg.append('g').attr('class', 'pontos-vazios');
    const gConexoes = svg.append('g').attr('class', 'conexoes');
    const gCheios = svg.append('g').attr('class', 'pontos-cheios');
    const gCaptura = svg.append('g').attr('class', 'captura');

    svg
      .append('text')
      .attr('transform', `translate(${xMatriz - 46},${MARGEM.topo + ALTURA_TOPO / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text('Moradores na combinação');

    svg
      .append('text')
      .attr('x', MARGEM.esq + LARGURA_TOTAIS / 2)
      .attr('y', VB_H - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text('Total por meio');

    // Faixa clara por linha: dá à matriz a "trilha" horizontal que deixa
    // seguir um meio da esquerda até a última coluna sem perder a altura.
    gFaixas
      .selectAll<SVGRectElement, string>('rect')
      .data(conjuntos)
      .join('rect')
      .attr('x', xMatriz - 10)
      .attr('y', (c) => centroLinha(c) - yConjunto.bandwidth() / 2)
      .attr('width', larguraMatriz + 20)
      .attr('height', yConjunto.bandwidth())
      .attr('rx', px(4))
      .attr('fill', theme.surface)
      .attr('opacity', 0.85);

    const barrasTopo = gBarrasTopo
      .selectAll<SVGRectElement, Intersecao>('rect')
      .data(intersecoes, (i) => i.id)
      .join('rect')
      .attr('fill', paleta.intersecao)
      .attr('rx', px(2));

    const valoresTopo = gValoresTopo
      .selectAll<SVGTextElement, Intersecao>('text')
      .data(intersecoes, (i) => i.id)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11))
      .text((i) => i.tamanho);

    const barrasTotais = gBarrasTotais
      .selectAll<SVGRectElement, string>('rect')
      .data(conjuntos)
      .join('rect')
      .attr('x', (c) => xTotal(totais[c]))
      .attr('y', (c) => centroLinha(c) - yConjunto.bandwidth() / 2.6)
      .attr('width', (c) => xTotal(0) - xTotal(totais[c]))
      .attr('height', yConjunto.bandwidth() / 1.3)
      .attr('rx', px(2))
      .attr('fill', paleta.conjunto);

    const rotulos = gRotulos
      .selectAll<SVGTextElement, string>('text')
      .data(conjuntos)
      .join('text')
      .attr('x', xMatriz - 22)
      .attr('y', (c) => centroLinha(c))
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('data-interactive', '')
      .text((c) => c);

    // Um par (combinação, meio) por célula da matriz. Os vazios existem sempre;
    // os cheios são redesenhados por cima da linha de conexão, senão ela
    // cortaria o meio de cada ponto — mesma ordem de camadas do script.R.
    interface Celula {
      id: string;
      conjunto: string;
      presente: boolean;
    }
    const celulas: Celula[] = intersecoes.flatMap((i) =>
      conjuntos.map((c) => ({ id: i.id, conjunto: c, presente: i.membros.includes(c) }))
    );
    const chaveCelula = (c: Celula) => `${c.id}__${c.conjunto}`;

    const vazios = gVazios
      .selectAll<SVGCircleElement, Celula>('circle')
      .data(celulas, chaveCelula)
      .join('circle')
      .attr('cy', (c) => centroLinha(c.conjunto))
      .attr('r', raioPonto)
      .attr('fill', paleta.vazio);

    const conexoes = gConexoes
      .selectAll<SVGLineElement, Intersecao>('line')
      .data(
        intersecoes.filter((i) => i.grau > 1),
        (i) => i.id
      )
      .join('line')
      .attr('stroke', paleta.intersecao)
      .attr('stroke-width', px(2.6));

    const cheios = gCheios
      .selectAll<SVGCircleElement, Celula>('circle')
      .data(
        celulas.filter((c) => c.presente),
        chaveCelula
      )
      .join('circle')
      .attr('cy', (c) => centroLinha(c.conjunto))
      .attr('r', raioPonto)
      .attr('fill', paleta.intersecao);

    const porId = new Map(intersecoes.map((i) => [i.id, i]));

    function conteudoColuna(i: Intersecao): string {
      const pct = ((i.tamanho / meta.respondentes) * 100).toFixed(1).replace('.', ',');
      const meios = i.grau === 1 ? 'só este meio' : `${i.grau} meios`;
      return (
        `<strong>${i.rotulo}</strong><br>` +
        `${comPontos(i.tamanho)} moradores (${pct}% da base) · ${meios}`
      );
    }

    function conteudoConjunto(c: string): string {
      const combinacoes = intersecoes.filter((i) => i.membros.includes(c));
      const soma = combinacoes.reduce((s, i) => s + i.tamanho, 0);
      return (
        `<strong>${c}</strong><br>` +
        `${comPontos(totais[c])} moradores no total<br>` +
        `${combinacoes.length} das ${intersecoes.length} combinações mostradas o incluem (${comPontos(soma)} moradores)`
      );
    }

    // Colunas e faixas invisíveis de captura: acertar um ponto de 9 de raio ou
    // uma barra estreita com o ponteiro é difícil, e a leitura cruzada só faz
    // sentido se bastar chegar perto da coluna ou da linha.
    const capturaColunas = gCaptura
      .selectAll<SVGRectElement, Intersecao>('rect.coluna')
      .data(intersecoes, (i) => i.id)
      .join('rect')
      .attr('class', 'coluna')
      .attr('y', MARGEM.topo)
      .attr('width', xInter.step())
      .attr('height', yTopoMatriz + alturaMatriz - MARGEM.topo)
      .attr('fill', 'transparent')
      .attr('data-interactive', '')
      .on('pointermove', (ev: PointerEvent, i: Intersecao) => tooltip.show(conteudoColuna(i), ev))
      .on('pointerleave', () => tooltip.hide());

    const capturaLinhas = gCaptura
      .selectAll<SVGRectElement, string>('rect.linha')
      .data(conjuntos)
      .join('rect')
      .attr('class', 'linha')
      .attr('x', MARGEM.esq)
      .attr('y', (c) => centroLinha(c) - yConjunto.step() / 2)
      .attr('width', xMatriz + larguraMatriz - MARGEM.esq)
      .attr('height', yConjunto.step())
      .attr('fill', 'transparent')
      .attr('data-interactive', '')
      .on('pointermove', (ev: PointerEvent, c: string) => tooltip.show(conteudoConjunto(c), ev))
      .on('pointerleave', () => tooltip.hide());

    let ordemAtual: OrdemId = 'tamanho';
    let realceColuna: string | null = null;
    let realceConjunto: string | null = null;

    /**
     * Uma combinação está "acesa" se for a coluna apontada, ou se contiver o
     * meio apontado. Um meio está aceso se for o apontado, ou se fizer parte
     * da coluna apontada. É esse par de regras que faz a leitura cruzada.
     */
    function colunaAcesa(i: Intersecao): boolean {
      if (realceColuna) return i.id === realceColuna;
      if (realceConjunto) return i.membros.includes(realceConjunto);
      return true;
    }
    function conjuntoAceso(c: string): boolean {
      if (realceConjunto) return c === realceConjunto;
      if (realceColuna) return porId.get(realceColuna)!.membros.includes(c);
      return true;
    }

    function aplicarRealce() {
      const ativo = realceColuna !== null || realceConjunto !== null;
      const opCol = (i: Intersecao) => (!ativo || colunaAcesa(i) ? 1 : 0.2);
      const opConj = (c: string) => (!ativo || conjuntoAceso(c) ? 1 : 0.25);

      const t = <S extends Selection<any, any, any, any>>(s: S) => s.transition('realce').duration(DURATION.fast);

      t(barrasTopo).attr('opacity', opCol);
      t(valoresTopo).attr('opacity', opCol);
      t(conexoes).attr('opacity', opCol);
      t(cheios).attr('opacity', (c: Celula) => opCol(porId.get(c.id)!));
      t(barrasTotais).attr('opacity', opConj);
      t(rotulos).attr('opacity', opConj).attr('font-weight', (c: string) => (realceConjunto === c ? 700 : 400));
      // As faixas de fundo acompanham o meio aceso: com uma linha destacada,
      // seguir a trilha dela até a última coluna fica mais fácil que com todas
      // as faixas iguais.
      t(gFaixas.selectAll<SVGRectElement, string>('rect')).attr('opacity', (c: string) =>
        !ativo ? 0.85 : conjuntoAceso(c) ? 1 : 0.4
      );
    }

    function realcar(chave: string) {
      const [tipo, valor] = chave.split(':');
      if (tipo === 'coluna') {
        realceColuna = valor;
        realceConjunto = null;
      } else {
        realceConjunto = valor;
        realceColuna = null;
      }
      aplicarRealce();
    }

    function limparRealce() {
      realceColuna = null;
      realceConjunto = null;
      aplicarRealce();
    }

    function desenharMoldura() {
      const eixoTopo = axisLeft(yTamanho).ticks(5).tickSizeOuter(0);
      gEixoTopo.call(eixoTopo as never);
      estilarEixo(gEixoTopo, theme, px);

      gGradeTopo
        .attr('transform', `translate(${xMatriz},0)`)
        .call(
          axisLeft(yTamanho)
            .ticks(5)
            .tickSize(-larguraMatriz)
            .tickFormat(() => '') as never
        );
      estilarGrade(gGradeTopo, theme);
      // A grade do painel de cima cresce pra DIREITA a partir do eixo; sem
      // inverter o sinal ela apareceria por cima dos nomes dos meios.
      gGradeTopo.selectAll('.tick line').attr('x2', larguraMatriz);

      // `d3.format(',d')` separa milhar com vírgula (padrão en-US) — em
      // português a vírgula é o separador DECIMAL, então "1,000" leria como um.
      gEixoTotais.call(
        axisBottom(xTotal)
          .ticks(4)
          .tickSizeOuter(0)
          .tickFormat(((v: number) => comPontos(v)) as never) as never
      );
      estilarEixo(gEixoTotais, theme, px);
    }

    function aplicarOrdem(ordem: OrdemId, transicao: boolean) {
      ordemAtual = ordem;
      xInter.domain(ordenar(ordem));

      const dur = transicao ? DURATION.slow : 0;
      type ComoSelecao = Selection<any, any, any, any>;
      // Mesmo motivo do gráfico de halteres: numa união Selection|Transition o
      // TypeScript resolve `.attr` pela sobrecarga de leitura e o encadeamento
      // quebra. Só `.attr` é chamado no resultado.
      const t = (s: ComoSelecao): ComoSelecao =>
        transicao ? (s.transition().duration(dur).ease(EASE_STATE) as unknown as ComoSelecao) : s;

      t(barrasTopo)
        .attr('x', (i: Intersecao) => xInter(i.id) ?? 0)
        .attr('y', (i: Intersecao) => yTamanho(i.tamanho))
        .attr('width', xInter.bandwidth())
        .attr('height', (i: Intersecao) => yTamanho(0) - yTamanho(i.tamanho));

      t(valoresTopo)
        .attr('x', (i: Intersecao) => centroCol(i.id))
        .attr('y', (i: Intersecao) => yTamanho(i.tamanho) - 7);

      t(vazios).attr('cx', (c: Celula) => centroCol(c.id));
      t(cheios).attr('cx', (c: Celula) => centroCol(c.id));

      t(conexoes)
        .attr('x1', (i: Intersecao) => centroCol(i.id))
        .attr('x2', (i: Intersecao) => centroCol(i.id))
        .attr('y1', (i: Intersecao) => Math.min(...i.membros.map(centroLinha)))
        .attr('y2', (i: Intersecao) => Math.max(...i.membros.map(centroLinha)));

      capturaColunas.attr('x', (i: Intersecao) => centroCol(i.id) - xInter.step() / 2);

      botoesOrdem.attr('aria-pressed', (o) => String(o.id === ordem));
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    controles.append('span').attr('class', 'viz-controles-rotulo').text('Ordenar por');
    const botoesOrdem = controles
      .selectAll<HTMLButtonElement, (typeof ORDENS)[number]>('button')
      .data(ORDENS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((o) => o.rotulo)
      .on('click', (_ev, o) => {
        if (o.id === ordemAtual) return;
        aplicarOrdem(o.id, true);
      });

    desenharMoldura();
    aplicarOrdem('tamanho', false);
    aplicarRealce();

    tornarFixavel(
      root,
      [
        { selecao: capturaColunas, chaveDe: (i: Intersecao) => `coluna:${i.id}` },
        { selecao: capturaLinhas, chaveDe: (c: string) => `conjunto:${c}` },
        { selecao: rotulos, chaveDe: (c: string) => `conjunto:${c}` },
      ],
      realcar,
      limparRealce
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const alturaFinal = (i: Intersecao) => yTamanho(0) - yTamanho(i.tamanho);
      const yFinal = (i: Intersecao) => yTamanho(i.tamanho);

      barrasTopo.attr('y', yTamanho(0)).attr('height', 0);
      valoresTopo.attr('opacity', 0);
      cheios.attr('r', 0);
      conexoes.attr('y2', (i) => Math.min(...i.membros.map(centroLinha)));

      barrasTopo
        .transition()
        .delay((_i, k) => stagger(k, intersecoes.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', yFinal)
        .attr('height', alturaFinal);

      cheios
        .transition()
        .delay((_c, k) => stagger(k, celulas.length) + DURATION.base)
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('r', raioPonto);

      conexoes
        .transition()
        .delay(DURATION.base)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y2', (i) => Math.max(...i.membros.map(centroLinha)));

      valoresTopo
        .transition()
        .delay((_i, k) => stagger(k, intersecoes.length) + DURATION.base)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        barrasTopo.interrupt().attr('y', yFinal).attr('height', alturaFinal);
        cheios.interrupt().attr('r', raioPonto);
        conexoes.interrupt().attr('y2', (i) => Math.max(...i.membros.map(centroLinha)));
        valoresTopo.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
