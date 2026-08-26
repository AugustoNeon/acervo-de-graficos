/**
 * Cascata (waterfall) — o caminho de um total até outro, parcela a parcela.
 *
 * Duas leituras do mesmo conjunto de parcelas, alternáveis:
 *
 * - **Cascata**: cada parcela começa onde a anterior parou. Responde "como se
 *   chegou de 2024 a 2025" — o encadeamento é a informação.
 * - **Contribuições**: todas as parcelas partem do zero. Responde "qual foi a
 *   maior alavanca" — uma pergunta diferente, que a cascata dificulta porque
 *   ali cada barra está numa altura diferente e comparar tamanhos exige
 *   ignorar a posição.
 *
 * Os dois totais só existem na cascata: no modo de contribuições eles não são
 * contribuição nenhuma, e mantê-los esmagaria a escala (2.860 contra parcelas
 * de no máximo 860). Por isso eles recuam em vez de encolher junto.
 *
 * O acumulado NÃO vem pronto do `data.json`: ele é recalculado aqui a cada
 * mudança de ordem, porque reordenar as parcelas muda o caminho — ainda que,
 * como o gráfico faz questão de mostrar, nunca mude o destino.
 */

import { select, scaleBand, scaleLinear, axisBottom, axisLeft, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Passo {
  rotulo: string;
  tipo: 'total' | 'aumento' | 'reducao';
  valor: number;
}

interface Dados {
  meta: {
    unidade: string;
    paleta: { aumento: string; reducao: string; total: string; conector: string };
    nota?: string;
  };
  passos: Passo[];
}

type ModoId = 'cascata' | 'contribuicoes';
type OrdemId = 'relato' | 'impacto';

const MODOS: { id: ModoId; rotulo: string }[] = [
  { id: 'cascata', rotulo: 'Cascata' },
  { id: 'contribuicoes', rotulo: 'Contribuições' },
];

const ORDENS: { id: OrdemId; rotulo: string }[] = [
  { id: 'relato', rotulo: 'Ordem do relato' },
  { id: 'impacto', rotulo: 'Impacto' },
];

const VB_W = 960;
const VB_H = 600;
const MARGEM = { topo: 28, dir: 24, baixo: 104, esq: 82 };

/** Formata em pt-BR: `d3.format` separa milhar com vírgula, que aqui é decimal. */
const comPontos = (v: number) => Math.abs(Math.round(v)).toLocaleString('pt-BR');
const comSinal = (v: number) => (v > 0 ? `+${comPontos(v)}` : v < 0 ? `−${comPontos(v)}` : '0');
/**
 * Formato do eixo. `comPontos` descarta o sinal de propósito (os rótulos de
 * parcela o escrevem por conta própria, com o `+` que nenhum formatador dá),
 * mas num eixo que desce abaixo do zero isso faria a marca de −400 ler como
 * 400 — o mesmo número duas vezes, em lados opostos da linha.
 */
const noEixo = (v: number) => (v < 0 ? `−${comPontos(v)}` : comPontos(v));

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Gráfico de cascata mostrando como a receita anual de uma rede de cafeterias vai de um ano ao ' +
    'outro através de parcelas de aumento e de redução, com um modo alternativo que compara as ' +
    'parcelas a partir do zero.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, passos } = data as Dados;
    const { paleta, unidade } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const parcelas = passos.filter((p) => p.tipo !== 'total');
    const totais = passos.filter((p) => p.tipo === 'total');
    const valorInicial = totais[0]?.valor ?? 0;
    const variacaoLiquida = parcelas.reduce((s, p) => s + p.valor, 0);

    const corDe = (p: Passo) =>
      p.tipo === 'total' ? paleta.total : p.valor >= 0 ? paleta.aumento : paleta.reducao;

    function ordenar(id: OrdemId): string[] {
      // Os dois totais são as âncoras da leitura e ficam sempre nas pontas:
      // reordená-los junto com as parcelas produziria uma cascata que começa
      // no meio do caminho.
      const meio = id === 'relato' ? parcelas : [...parcelas].sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
      return [passos[0].rotulo, ...meio.map((p) => p.rotulo), passos[passos.length - 1].rotulo];
    }

    interface Faixa {
      inicio: number;
      fim: number;
    }

    /** Percorre a ordem dada acumulando — é o que define a geometria da cascata. */
    function acumular(ordem: string[]): Map<string, Faixa> {
      const porRotulo = new Map(passos.map((p) => [p.rotulo, p]));
      const faixas = new Map<string, Faixa>();
      let acumulado = 0;
      for (const rotulo of ordem) {
        const p = porRotulo.get(rotulo)!;
        if (p.tipo === 'total') {
          faixas.set(rotulo, { inicio: 0, fim: p.valor });
          acumulado = p.valor;
        } else {
          faixas.set(rotulo, { inicio: acumulado, fim: acumulado + p.valor });
          acumulado += p.valor;
        }
      }
      return faixas;
    }

    const xPasso = scaleBand<string>().domain(ordenar('relato')).range([0, larguraUtil]).padding(0.42);

    // O pico do acumulado MUDA com a ordem das parcelas (na ordem do relato os
    // três aumentos vêm juntos e a cascata sobe mais alto do que na ordem por
    // impacto). A escala cobre o maior pico entre as duas ordens e fica fixa:
    // assim reordenar move as barras sem reescalar o eixo — que é justamente o
    // que deixa ver que o caminho muda e o destino não.
    const picoDe = (id: OrdemId) => {
      const seq = ordenar(id);
      const f = acumular(seq);
      return Math.max(...seq.map((r) => f.get(r)!.fim));
    };
    const topoCascata = Math.max(picoDe('relato'), picoDe('impacto'));
    const yCascata = scaleLinear().domain([0, topoCascata * 1.1]).range([alturaUtil, 0]);

    const minParcela = Math.min(0, ...parcelas.map((p) => p.valor));
    const maxParcela = Math.max(0, ...parcelas.map((p) => p.valor));
    const yContrib = scaleLinear()
      .domain([minParcela * 1.28, maxParcela * 1.22])
      .range([alturaUtil, 0]);

    const escalaY = (modo: ModoId) => (modo === 'cascata' ? yCascata : yContrib);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g').attr('class', 'grade');
    const gReferencia = g.append('g').attr('class', 'referencia');
    const gConectores = g.append('g').attr('class', 'conectores');
    const gBarras = g.append('g').attr('class', 'barras');
    const gValores = g.append('g').attr('class', 'valores');
    const gEixoX = g.append('g').attr('class', 'eixo-x').attr('transform', `translate(0,${alturaUtil})`);
    const gEixoY = g.append('g').attr('class', 'eixo-y');
    const gCaptura = g.append('g').attr('class', 'captura');

    // Linha no valor de partida: deixa ver de relance em que ponto da cascata o
    // acumulado passou (ou voltou para baixo) do total do ano anterior.
    const linhaReferencia = gReferencia
      .append('line')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('stroke', theme.borderStrong)
      .attr('stroke-dasharray', '5 5');

    const rotuloEixoY = g
      .append('text')
      .attr('transform', `translate(${-60},${alturaUtil / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12));

    const barras = gBarras
      .selectAll<SVGRectElement, Passo>('rect')
      .data(passos, (p) => p.rotulo)
      .join('rect')
      .attr('fill', corDe)
      .attr('rx', px(2));

    const valores = gValores
      .selectAll<SVGTextElement, Passo>('text')
      .data(passos, (p) => p.rotulo)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11.5))
      .attr('font-weight', 600)
      .attr('fill', (p) => (p.tipo === 'total' ? theme.ink : corDe(p)))
      .text((p) => (p.tipo === 'total' ? comPontos(p.valor) : comSinal(p.valor)));

    // Sete conectores para oito passos: cada um liga a posição i à i+1. Como a
    // topologia muda a cada reordenação, eles são ligados por POSIÇÃO, não pelo
    // passo — é a posição que persiste entre as ordens, não o par de passos.
    const conectores = gConectores
      .selectAll<SVGLineElement, number>('line')
      .data(passos.slice(0, -1).map((_, i) => i))
      .join('line')
      .attr('stroke', paleta.conector)
      .attr('stroke-width', px(1.6));

    const capturas = gCaptura
      .selectAll<SVGRectElement, Passo>('rect')
      .data(passos, (p) => p.rotulo)
      .join('rect')
      .attr('y', 0)
      .attr('height', alturaUtil)
      .attr('width', xPasso.step())
      .attr('fill', 'transparent')
      .attr('data-interactive', '')
      .on('pointermove', (ev: PointerEvent, p: Passo) => tooltip.show(conteudoTooltip(p), ev))
      .on('pointerleave', () => tooltip.hide());

    let modoAtual: ModoId = 'cascata';
    let ordemAtual: OrdemId = 'relato';
    let realce: string | null = null;
    let faixas = acumular(ordenar('relato'));

    function conteudoTooltip(p: Passo): string {
      if (p.tipo === 'total') {
        return `<strong>${p.rotulo}</strong><br>${comPontos(p.valor)} ${unidade}`;
      }
      const f = faixas.get(p.rotulo)!;
      const pesoNaVariacao = Math.abs((p.valor / variacaoLiquida) * 100).toFixed(0);
      const sentido = p.valor >= 0 ? 'a favor' : 'contra';
      // Linhas curtas de propósito: numa só, o texto fica largo o bastante pra
      // o tooltip encostar na borda da janela quando o cursor está à direita.
      return (
        `<strong>${p.rotulo}</strong><br>` +
        `<span class="viz-swatch" style="background:${corDe(p)}"></span>` +
        `${comSinal(p.valor)} ${unidade}, ${sentido}<br>` +
        `${pesoNaVariacao}% da variação líquida<br>` +
        `Acumulado: ${comPontos(f.inicio)} → ${comPontos(f.fim)}`
      );
    }

    const rotulosDeTotal = new Set(totais.map((p) => p.rotulo));

    function aplicarRealce() {
      // Dois fatores independentes multiplicados: o realce apagado do usuário e
      // o recuo dos totais no modo de contribuições. Tratá-los como um `if` só
      // faria um sobrescrever o outro conforme a ordem das chamadas.
      const op = (p: Passo) => (realce && p.rotulo !== realce ? 0.22 : 1);
      const recuo = (rotulo: string) => (modoAtual === 'contribuicoes' && rotulosDeTotal.has(rotulo) ? 0 : 1);
      const t = <S extends Selection<any, any, any, any>>(s: S) => s.transition('realce').duration(DURATION.fast);

      t(barras).attr('opacity', (p: Passo) => op(p) * recuo(p.rotulo));
      t(valores).attr('opacity', (p: Passo) => op(p) * recuo(p.rotulo));
      // Sem o recuo aqui, "Receita 2024" e "Receita 2025" ficariam no eixo sem
      // barra nenhuma acima deles no modo de contribuições.
      t(gEixoX.selectAll<SVGTextElement, string>('.tick text')).attr(
        'opacity',
        (r: string) => (realce && r !== realce ? 0.35 : 1) * recuo(r)
      );
    }

    function realcar(chave: string) {
      realce = chave;
      aplicarRealce();
    }
    function limpar() {
      realce = null;
      aplicarRealce();
    }

    function aplicar(modo: ModoId, ordem: OrdemId, transicao: boolean) {
      modoAtual = modo;
      ordemAtual = ordem;
      const sequencia = ordenar(ordem);
      xPasso.domain(sequencia);
      faixas = acumular(sequencia);

      const y = escalaY(modo);
      const ehCascata = modo === 'cascata';
      const dur = transicao ? DURATION.slow : 0;
      type ComoSelecao = Selection<any, any, any, any>;
      const t = (s: ComoSelecao): ComoSelecao =>
        transicao ? (s.transition().duration(dur).ease(EASE_STATE) as unknown as ComoSelecao) : s;

      // No modo de contribuições cada parcela parte do zero; na cascata, do
      // acumulado. Os totais mantêm a geometria da cascata mesmo escondidos,
      // pra que voltar ao outro modo não os traga de um lugar arbitrário.
      const faixaDe = (p: Passo): Faixa => {
        if (ehCascata || p.tipo === 'total') return faixas.get(p.rotulo)!;
        return { inicio: 0, fim: p.valor };
      };
      const topo = (p: Passo) => y(Math.max(faixaDe(p).inicio, faixaDe(p).fim));
      const altura = (p: Passo) => Math.abs(y(faixaDe(p).inicio) - y(faixaDe(p).fim));

      t(barras)
        .attr('x', (p: Passo) => xPasso(p.rotulo) ?? 0)
        .attr('width', xPasso.bandwidth())
        .attr('y', topo)
        .attr('height', altura);

      t(valores)
        .attr('x', (p: Passo) => (xPasso(p.rotulo) ?? 0) + xPasso.bandwidth() / 2)
        // O rótulo fica sempre do lado de FORA da barra: acima quando ela sobe,
        // abaixo quando desce. Depender da altura da barra pra caber dentro
        // falharia justamente nas parcelas pequenas, que são as que mais
        // precisam do número.
        .attr('y', (p: Passo) => {
          const f = faixaDe(p);
          return f.fim >= f.inicio ? y(Math.max(f.inicio, f.fim)) - 9 : y(Math.min(f.inicio, f.fim)) + 19;
        });

      t(conectores)
        .attr('opacity', ehCascata ? 1 : 0)
        .attr('x1', (i: number) => (xPasso(sequencia[i]) ?? 0) + xPasso.bandwidth())
        .attr('x2', (i: number) => xPasso(sequencia[i + 1]) ?? 0)
        .attr('y1', (i: number) => y(faixas.get(sequencia[i])!.fim))
        .attr('y2', (i: number) => y(faixas.get(sequencia[i])!.fim));

      t(linhaReferencia).attr('opacity', ehCascata ? 1 : 0).attr('y1', y(valorInicial)).attr('y2', y(valorInicial));

      capturas
        .attr('x', (p: Passo) => (xPasso(p.rotulo) ?? 0) - (xPasso.step() - xPasso.bandwidth()) / 2)
        // Sem isso, a faixa de captura dos totais continuaria abrindo tooltip
        // no modo de contribuições, onde a barra deles nem está desenhada.
        .attr('pointer-events', (p: Passo) => (!ehCascata && p.tipo === 'total' ? 'none' : null));

      const eixoY = axisLeft(y).ticks(6).tickSizeOuter(0).tickFormat(((v: number) => noEixo(v)) as never);
      (transicao ? gEixoY.transition().duration(dur).ease(EASE_STATE) : gEixoY).call(eixoY as never);
      estilarEixo(gEixoY, theme, px);

      gGrade.call(
        axisLeft(y)
          .ticks(6)
          .tickSize(-larguraUtil)
          .tickFormat(() => '') as never
      );
      estilarGrade(gGrade, theme);
      gGrade.selectAll('.tick line').attr('x2', larguraUtil);

      gEixoX.call(axisBottom(xPasso).tickSizeOuter(0) as never);
      estilarEixo(gEixoX, theme, px);
      gEixoX
        .selectAll('text')
        .attr('transform', 'rotate(-22)')
        .attr('text-anchor', 'end')
        .attr('dx', px(-2))
        .attr('dy', px(6));

      rotuloEixoY.text(
        ehCascata ? `Receita anual (${unidade})` : `Contribuição para a variação (${unidade})`
      );

      botoesModo.attr('aria-pressed', (m) => String(m.id === modo));
      botoesOrdem.attr('aria-pressed', (o) => String(o.id === ordem));
      aplicarRealce();
    }

    const controlesModo = select(root).append('div').attr('class', 'viz-controles');
    controlesModo.append('span').attr('class', 'viz-controles-rotulo').text('Leitura');
    const botoesModo = controlesModo
      .selectAll<HTMLButtonElement, (typeof MODOS)[number]>('button')
      .data(MODOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((m) => m.rotulo)
      .on('click', (_ev, m) => {
        if (m.id === modoAtual) return;
        aplicar(m.id, ordemAtual, true);
      });

    const controlesOrdem = select(root).append('div').attr('class', 'viz-controles');
    controlesOrdem.append('span').attr('class', 'viz-controles-rotulo').text('Parcelas por');
    const botoesOrdem = controlesOrdem
      .selectAll<HTMLButtonElement, (typeof ORDENS)[number]>('button')
      .data(ORDENS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((o) => o.rotulo)
      .on('click', (_ev, o) => {
        if (o.id === ordemAtual) return;
        aplicar(modoAtual, o.id, true);
      });

    aplicar('cascata', 'relato', false);

    tornarFixavel(root, [{ selecao: capturas, chaveDe: (p: Passo) => p.rotulo }], realcar, limpar);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      // A entrada percorre a cascata da esquerda pra direita, e cada barra
      // nasce colada no nível em que a anterior parou — é o próprio gesto que
      // o gráfico descreve, e não um efeito genérico de "crescer do zero".
      const topoFinal = (p: Passo) => escalaY('cascata')(Math.max(faixas.get(p.rotulo)!.inicio, faixas.get(p.rotulo)!.fim));
      const alturaFinal = (p: Passo) =>
        Math.abs(escalaY('cascata')(faixas.get(p.rotulo)!.inicio) - escalaY('cascata')(faixas.get(p.rotulo)!.fim));
      const nivelPartida = (p: Passo) =>
        escalaY('cascata')(p.tipo === 'total' ? 0 : faixas.get(p.rotulo)!.inicio);

      barras.attr('y', nivelPartida).attr('height', 0);
      valores.attr('opacity', 0);
      conectores.attr('opacity', 0);

      // `stagger()` limita o passo a 28ms — teto que existe pra não gastar 4s
      // escalonando 96 barras. Aqui são 8, e o encadeamento É a informação: com
      // 28ms elas nascem praticamente juntas e a cascata não chega a "andar".
      // Passo fixo mais largo, com o total ainda abaixo de um segundo.
      const passo = (i: number) => i * 85;

      barras
        .transition()
        .delay((_p, i) => passo(i))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', topoFinal)
        .attr('height', alturaFinal);

      valores
        .transition()
        .delay((_p, i) => passo(i) + DURATION.base)
        .duration(DURATION.base)
        .attr('opacity', 1);

      conectores
        .transition()
        .delay((i) => passo(i) + DURATION.base)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(passo(passos.length - 1) + DURATION.enter + DURATION.base + 250, () => {
        barras.interrupt().attr('y', topoFinal).attr('height', alturaFinal);
        valores.interrupt().attr('opacity', 1);
        conectores.interrupt().attr('opacity', 1);
        aplicarRealce();
      });
    }
  },
};

export default chart;
