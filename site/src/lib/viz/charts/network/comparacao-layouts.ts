import { redeChart } from '../../shared/rede';

export default redeChart({
  label:
    'O mesmo grafo de 30 nós desenhado lado a lado por três algoritmos de layout — ' +
    'Fruchterman-Reingold, DrL e posicionamento aleatório — para comparar como cada um ' +
    'organiza a mesma estrutura. Cor e tamanho do nó indicam o seu grau.',
  aspectRatio: 12 / 4.5,
});
