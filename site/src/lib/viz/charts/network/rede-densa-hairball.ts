import { redeChart } from '../../shared/rede';

export default redeChart({
  label:
    'Rede densa em formato "hairball": cerca de 65 nós com muitas conexões e sem padrão ' +
    'visível, ilustrando o que acontece quando um grafo tem conexões demais para ser lido ' +
    'como desenho. Cor e tamanho de cada nó indicam o seu grau.',
  aspectRatio: 8 / 7,
});
