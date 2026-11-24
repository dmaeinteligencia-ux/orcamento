const moeda = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const reais = (v) => moeda.format(Number(v ?? 0))
export const nomeMes = (mes) => MESES[mes - 1]
export const rotuloCompetencia = (c) => (c ? `${nomeMes(c.mes)}/${c.ano}` : '')
export const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca')
export const negativo = (v) => Number(v) < 0
