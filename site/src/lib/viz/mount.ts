/**
 * Runtime dos graficos interativos.
 *
 * Procura todo `[data-viz]` da pagina, carrega sob demanda o modulo do grafico
 * correspondente (`charts/<categoria>/<slug>.ts`) e o `data.json` gerado pelo
 * script.R, e cuida do ciclo de vida: primeiro desenho, redesenho no resize,
 * animacao de entrada e fallback.
 *
 * O grafico e montado direto no fluxo da pagina, sem <iframe>. E o que permite
 * ele herdar as fontes e a paleta do site (ver theme.ts) e animar junto com o
 * scroll -- as duas coisas que um iframe torna impossiveis.
 */

import { getTheme } from './theme';
import { createTooltip, type Tooltip } from './tooltip';
import { onEnterViewport, prefersReducedMotion } from './motion';
import type { VizChart } from './types';

// Vite resolve isso em tempo de build num mapa de imports dinamicos: cada
// grafico vira um chunk separado, baixado so na pagina dele.
const modules = import.meta.glob<{ default: VizChart }>('./charts/**/*.ts');

let tooltipCompartilhado: Tooltip | null = null;
function getTooltip(): Tooltip {
  if (!tooltipCompartilhado) tooltipCompartilhado = createTooltip();
  return tooltipCompartilhado;
}

function estaVisivel(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

async function montar(host: HTMLElement): Promise<void> {
  const id = host.dataset.viz; // "<categoria>/<slug>"
  const dataUrl = host.dataset.vizData;
  if (!id || !dataUrl) return;

  const carregar = modules[`./charts/${id}.ts`];
  if (!carregar) {
    console.warn(`[viz] modulo nao encontrado para "${id}" — mantendo a imagem estatica`);
    return;
  }

  let chart: VizChart;
  let data: unknown;
  try {
    const [mod, resposta] = await Promise.all([carregar(), fetch(dataUrl)]);
    if (!resposta.ok) throw new Error(`data.json respondeu ${resposta.status}`);
    chart = mod.default;
    data = await resposta.json();
  } catch (erro) {
    // O fallback (output.png) ja esta na tela; so registramos e saimos.
    console.warn(`[viz] falha ao carregar "${id}" — mantendo a imagem estatica`, erro);
    return;
  }

  const canvas = document.createElement('div');
  canvas.className = 'viz-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', chart.label);

  const fallback = host.querySelector<HTMLElement>('[data-viz-fallback]');
  host.insertBefore(canvas, fallback);
  fallback?.remove();
  host.dataset.vizState = 'ready';

  const tooltip = getTooltip();
  const theme = getTheme();
  const medir = () => Math.round(host.getBoundingClientRect().width);
  let largura = 0;

  const desenhar = (animate: boolean) => {
    if (largura <= 0) return;
    canvas.replaceChildren();
    chart.draw({ root: canvas, data, width: largura, theme, tooltip, animate });
  };

  const podeAnimar = !prefersReducedMotion();
  let desenhou = false;

  /**
   * Primeiro desenho: sempre no estado final. A animacao so entra se o grafico
   * ja estiver a vista; se estiver abaixo da dobra ele e redesenhado animando
   * quando chegar la, e ninguem chega a ver a versao sem animacao.
   */
  const primeiroDesenho = () => {
    if (desenhou) return;
    desenhou = true;
    const aVista = estaVisivel(host);
    desenhar(podeAnimar && aVista);
    if (podeAnimar && !aVista) {
      onEnterViewport(host, () => desenhar(true));
    }
  };

  // A medida inicial e sincrona de proposito: o ResizeObserver so entrega a
  // primeira notificacao num frame composto, e esse frame pode nunca chegar
  // (aba em segundo plano, renderer headless). Amarrar o primeiro desenho a
  // ele deixaria o grafico em branco pra sempre nesses casos -- e o mesmo
  // defeito ja visto em widget de pacote que mede o container uma vez so.
  largura = medir();
  primeiroDesenho();

  // Daqui pra frente o observer cuida so de redimensionamento. Redesenho por
  // resize nunca reanima: seria ruido a cada arrasto de janela.
  const ro = new ResizeObserver(() => {
    const nova = medir();
    if (nova <= 0 || nova === largura) return;
    largura = nova;
    if (!desenhou) primeiroDesenho();
    else desenhar(false);
  });

  ro.observe(host);
}

export function mountAllViz(): void {
  document.querySelectorAll<HTMLElement>('[data-viz]').forEach((host) => {
    void montar(host);
  });
}
