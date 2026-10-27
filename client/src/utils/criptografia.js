/**
 * GhostTalk — Utilitário de Criptografia (E2EE)
 * Implementa criptografia ponta a ponta usando TweetNaCl.js.
 *
 * MODELO DE SEGURANÇA:
 * - Cada usuário tem um par de chaves: pública (compartilhada) e privada (local)
 * - Mensagens são criptografadas com a chave pública do destinatário
 * - Apenas o destinatário pode descriptografar com sua chave privada
 * - O servidor armazena apenas o blob cifrado — NUNCA o texto original
 *
 * Biblioteca: TweetNaCl.js (implementação auditada de NaCl)
 * Algoritmo: Curve25519-XSalsa20-Poly1305 (box)
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// A tweetnacl-util pode exportar as funções de formas diferentes dependendo do bundler.
// Usamos TextEncoder/TextDecoder nativos do browser para maior compatibilidade e
// apenas encodeBase64/decodeBase64 da biblioteca.
const { encodeBase64, decodeBase64 } = naclUtil;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Wrappers compatíveis com todas as versões de bundler
function encodeUTF8(texto) { return encoder.encode(texto); }
function decodeUTF8(bytes) { return decoder.decode(bytes); }

// Chave de armazenamento no localStorage
const CHAVE_PRIVADA_KEY = 'ghosttalk_chave_privada';
const CHAVE_PUBLICA_KEY = 'ghosttalk_chave_publica';

// ----------------------------------------------------------------
// Geração e gerenciamento de chaves
// ----------------------------------------------------------------

/**
 * Gera um novo par de chaves para o usuário.
 * Deve ser chamado uma única vez no cadastro.
 * @returns {{ chavePublica: string, chavePrivada: string }} chaves em Base64
 */
export function gerarParDeChaves() {
  const par = nacl.box.keyPair();
  const chavePublica = encodeBase64(par.publicKey);
  const chavePrivada = encodeBase64(par.secretKey);

  // Armazena a chave privada APENAS localmente — nunca enviada ao servidor
  localStorage.setItem(CHAVE_PRIVADA_KEY, chavePrivada);
  localStorage.setItem(CHAVE_PUBLICA_KEY, chavePublica);

  return { chavePublica, chavePrivada };
}

/**
 * Recupera o par de chaves do localStorage.
 * Retorna null se o usuário ainda não tem chaves geradas.
 */
export function obterParDeChaves() {
  const chavePrivada = localStorage.getItem(CHAVE_PRIVADA_KEY);
  const chavePublica = localStorage.getItem(CHAVE_PUBLICA_KEY);

  if (!chavePrivada || !chavePublica) return null;

  return { chavePublica, chavePrivada };
}

/**
 * Remove as chaves do dispositivo (logout ou modo incógnito).
 */
export function removerChavesLocais() {
  localStorage.removeItem(CHAVE_PRIVADA_KEY);
  localStorage.removeItem(CHAVE_PUBLICA_KEY);
}

// ----------------------------------------------------------------
// Criptografia de mensagens
// ----------------------------------------------------------------

/**
 * Criptografa uma mensagem para um destinatário específico.
 * Usa a chave pública do destinatário e a chave privada do remetente.
 *
 * @param {string} mensagemTexto - Texto original da mensagem
 * @param {string} chavePublicaDestinatarioB64 - Chave pública do destinatário em Base64
 * @returns {{ conteudoCriptografado: string, nonce: string }} blob cifrado e nonce
 */
export function criptografarMensagem(mensagemTexto, chavePublicaDestinatarioB64) {
  const chaves = obterParDeChaves();
  if (!chaves) throw new Error('Chaves criptográficas não encontradas. Faça login novamente.');

  const mensagemBytes = encodeUTF8(mensagemTexto);
  const chavePublicaDestinatario = decodeBase64(chavePublicaDestinatarioB64);
  const chavePrivadaRemetente = decodeBase64(chaves.chavePrivada);

  // Gera um nonce aleatório único para esta mensagem
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Criptografa com a chave pública do destinatário
  const mensagemCifrada = nacl.box(
    mensagemBytes,
    nonce,
    chavePublicaDestinatario,
    chavePrivadaRemetente
  );

  return {
    conteudoCriptografado: encodeBase64(mensagemCifrada),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Descriptografa uma mensagem recebida.
 * Usa a chave pública do remetente e a chave privada do destinatário.
 *
 * @param {string} conteudoCriptografadoB64 - Blob cifrado em Base64
 * @param {string} nonceB64 - Nonce em Base64
 * @param {string} chavePublicaRemetenteB64 - Chave pública do remetente em Base64
 * @returns {string|null} Texto original, ou null se a descriptografia falhar
 */
export function descriptografarMensagem(conteudoCriptografadoB64, nonceB64, chavePublicaRemetenteB64) {
  try {
    const chaves = obterParDeChaves();
    if (!chaves) return null;

    const conteudoCifrado = decodeBase64(conteudoCriptografadoB64);
    const nonce = decodeBase64(nonceB64);
    const chavePublicaRemetente = decodeBase64(chavePublicaRemetenteB64);
    const chavePrivadaLocal = decodeBase64(chaves.chavePrivada);

    // Descriptografa — retorna null se falhar (mensagem inválida ou chave errada)
    const mensagemBytes = nacl.box.open(
      conteudoCifrado,
      nonce,
      chavePublicaRemetente,
      chavePrivadaLocal
    );

    if (!mensagemBytes) return null;

    return decodeUTF8(mensagemBytes);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// Criptografia simétrica para exportação de backups
// ----------------------------------------------------------------

/**
 * Deriva uma chave simétrica a partir de uma senha usando PBKDF2-SHA256.
 * Usada para criptografar arquivos de exportação.
 *
 * @param {string} senha - Senha definida pelo usuário
 * @param {Uint8Array} sal - Sal aleatório para derivação
 * @returns {Promise<Uint8Array>} Chave derivada de 32 bytes
 */
export async function derivarChaveDeSenha(senha, sal) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(senha),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: sal,
      iterations: 100000, // 100k iterações — resistente a força bruta
      hash: 'SHA-256',
    },
    material,
    256
  );

  return new Uint8Array(bits);
}

/**
 * Criptografa dados arbitrários com uma senha (para exportação de backup).
 * Formato do resultado: [sal(16) | nonce(24) | dados_cifrados]
 *
 * @param {string} dados - Texto a criptografar
 * @param {string} senha - Senha do usuário
 * @returns {Promise<string>} Dados criptografados em Base64
 */
export async function criptografarComSenha(dados, senha) {
  const sal = nacl.randomBytes(16);
  const chave = await derivarChaveDeSenha(senha, sal);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const dadosCifrados = nacl.secretbox(encodeUTF8(dados), nonce, chave);

  // Combina sal + nonce + dados cifrados em um único blob
  const blob = new Uint8Array(sal.length + nonce.length + dadosCifrados.length);
  blob.set(sal, 0);
  blob.set(nonce, sal.length);
  blob.set(dadosCifrados, sal.length + nonce.length);

  return encodeBase64(blob);
}

/**
 * Descriptografa um backup exportado.
 *
 * @param {string} dadosCriptografadosB64 - Blob em Base64
 * @param {string} senha - Senha do usuário
 * @returns {Promise<string|null>} Dados originais ou null se senha incorreta
 */
export async function descriptografarComSenha(dadosCriptografadosB64, senha) {
  try {
    const blob = decodeBase64(dadosCriptografadosB64);
    const sal = blob.slice(0, 16);
    const nonce = blob.slice(16, 16 + nacl.secretbox.nonceLength);
    const dadosCifrados = blob.slice(16 + nacl.secretbox.nonceLength);

    const chave = await derivarChaveDeSenha(senha, sal);
    const dadosBytes = nacl.secretbox.open(dadosCifrados, nonce, chave);

    if (!dadosBytes) return null;
    return decodeUTF8(dadosBytes);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// Fingerprint de conversa para verificação de integridade
// ----------------------------------------------------------------

/**
 * Gera o fingerprint de segurança de uma conversa.
 * Ambos os participantes devem ver o mesmo fingerprint para confirmar
 * que não há interceptação (similar ao "código de segurança" do WhatsApp).
 *
 * @param {string} chavePublicaA - Chave pública do participante A
 * @param {string} chavePublicaB - Chave pública do participante B
 * @returns {Promise<string>} Fingerprint hexadecimal formatado
 */
export async function gerarFingerprintConversa(chavePublicaA, chavePublicaB) {
  const encoder = new TextEncoder();
  // Ordena as chaves para que o fingerprint seja igual em ambos os lados
  const chaves = [chavePublicaA, chavePublicaB].sort().join('|');
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(chaves));
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  // Formata em grupos de 4 para facilitar a leitura
  return hashHex.match(/.{1,4}/g).join(' ').toUpperCase();
}
