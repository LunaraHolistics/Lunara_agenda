import { Cliente, Terapia, Agendamento, Pacote, Transacao } from './types';

export const INITIAL_CLIENTES: Cliente[] = [
  {"id":"1773408188456","nome":"Andreza","telefone":"+55 (16) 99963-7420","observacoes":"Andreza Gregório\nDN:\nAraraquara/SP"},
  {"id":"1773408253096","nome":"Amanda","telefone":"+55 (14) 99822-9743","observacoes":"Amanda Leticia Bento Dias\nDN: 05/03/1994\nOurinhos/SP"},
  {"id":"1773408420265","nome":"Ana Paula","telefone":"+44 7541648981","observacoes":"Ana Paula Alessandro\nDN 21/06/1969\nLondres/UK"},
  {"id":"1773408497152","nome":"Ivone","telefone":"+55 (11) 99956-7127","observacoes":"Ivone Fernandes Alves\nDN 08/07/1948\nSantos/SP"},
  {"id":"1773408612254","nome":"Márcia","telefone":"+55 (11) 98388-3879","observacoes":"Márcia Eloísa Silva Monteiro\nDN 24/11/1972\nGuararema/SP"},
  {"id":"1773408796451","nome":"Rosemeire","telefone":"+55 (16) 99414-9085","observacoes":"Rosemeire Rodrigues dos Santos Lancelotti\nDN 16/01/1984\nSão Carlos/SP"},
  {"id":"1773408936330","nome":"Anne","telefone":"+44 7752188938","observacoes":"Anne Caroline Lins Bezerra\nDN 24/07/\nLondres/UK"},
  {"id":"1773408991874","nome":"Cindia","telefone":"+55 (16) 98250-2610","observacoes":"Cindia Lancelotti\nDN 26/10/1987\nSão Carlos/SP"},
  {"id":"1773409057738","nome":"Maria Aparecida","telefone":"+55 (14) 99706-6353","observacoes":"Maria Aparecida da Silva\nDN 31/08/1979\nOurinhos/SP"},
  {"id":"1773409119145","nome":"Isabel","telefone":"+55 (16) 99744-5647","observacoes":"Isabel Cristina Silva Nepomuceno\nDN 11/10/1969\nAraraquara/SP"}
];

export const INITIAL_TERAPIAS: Terapia[] = [
  {"id":"1773410592031","nome":"Alinhamento chakras","valor":70,"duracao":15},
  {"id":"1773410607847","nome":"Cartomancia","valor":120,"duracao":50},
  {"id":"1773410624723","nome":"Biomagnetismo","valor":60,"duracao":20},
  {"id":"1773410782282","nome":"Ativação de gráficos","valor":70,"duracao":5},
  {"id":"1773411090916","nome":"Pesquisa radiestésica","valor":20,"duracao":15},
  {"id":"1773411230312","nome":"Limpeza/Banimento","valor":80,"duracao":10},
  {"id":"1773411287942","nome":"Chakras/Bio Pets","valor":80,"duracao":20}
];

export const INITIAL_PACOTES: Pacote[] = [];
export const INITIAL_AGENDAMENTOS: Agendamento[] = [];
export const INITIAL_TRANSACOES: Transacao[] = [];
