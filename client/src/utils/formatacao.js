/**
 * GhostTalk — Utilitários de formatação de data/hora e texto
 */
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata o horário de uma mensagem.
 * - Hoje: apenas hora (ex: "14:32")
 * - Ontem: "Ontem"
 * - Outros: data curta (ex: "12/05")
 */
export function formatarHoraMensagem(data) {
  const dataObj = typeof data === 'string' ? parseISO(data) : data;

  if (isToday(dataObj)) {
    return format(dataObj, 'HH:mm');
  }
  if (isYesterday(dataObj)) {
    return 'Ontem';
  }
  return format(dataObj, 'dd/MM/yy');
}

/**
 * Formata data e hora completas (para exportação e tooltips).
 */
export function formatarDataCompleta(data) {
  const dataObj = typeof data === 'string' ? parseISO(data) : new Date(data);
  return format(dataObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata tempo relativo (ex: "há 5 minutos").
 */
export function formatarTempoRelativo(data) {
  const dataObj = typeof data === 'string' ? parseISO(data) : new Date(data);
  return formatDistanceToNow(dataObj, { addSuffix: true, locale: ptBR });
}

/**
 * Formata o tamanho de um arquivo em formato legível.
 */
export function formatarTamanhoArquivo(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Trunca um texto longo com reticências.
 */
export function truncar(texto, limite = 50) {
  if (!texto) return '';
  return texto.length > limite ? `${texto.substring(0, limite)}...` : texto;
}

/**
 * Retorna as iniciais de um nome (para avatar padrão).
 */
export function obterIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(' ');
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

/**
 * Gera uma cor consistente baseada no nome do usuário (para avatares coloridos).
 */
export function corDoAvatar(nome) {
  if (!nome) return '#7c3aed';
  const cores = [
    '#7c3aed', '#2563eb', '#059669', '#d97706',
    '#dc2626', '#db2777', '#0891b2', '#65a30d',
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cores[Math.abs(hash) % cores.length];
}
