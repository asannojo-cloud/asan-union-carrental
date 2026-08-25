import crypto from "crypto";
import { env } from "../config/env";

/**
 * 이름/전화번호/방문지역/대여목적 등 개인정보 컬럼을 저장 전 암호화(AES-256-GCM)하기 위한 유틸.
 *
 * - 키(ENCRYPTION_KEY)는 DB가 아닌 서버 환경변수에만 존재한다 — DB(Neon)를 운영하는 쪽이
 *   접속정보를 얻더라도 평문을 복원할 수 없다 (애플리케이션 계층 암호화).
 * - 값마다 무작위 IV를 사용하므로 같은 평문이라도 매번 다른 암호문이 생성된다. 그 결과
 *   SQL의 ILIKE로 암호문을 부분검색할 수 없어, 관리자 검색(이름/전화번호)은 서비스 계층에서
 *   복호화 후 필터링한다 (reservations.service.ts 참고). 이 앱 규모(연간 수십~수백 건)에서는
 *   충분히 실용적인 절충이다.
 * - "v1:" 접두사로 버전을 표시해 향후 키 교체(재암호화 마이그레이션) 시 이전/이후 값을 구분할 수 있다.
 */

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1:";
const IV_LENGTH = 12; // GCM 권장 IV 길이
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(env.encryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY는 base64로 인코딩된 32바이트(256비트) 값이어야 합니다.");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(stored: string): string {
  if (!isEncrypted(stored)) {
    // 마이그레이션 이전에 평문으로 저장된 값 등 — 그대로 반환해 하위 호환을 유지한다.
    return stored;
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** null 허용 필드용 헬퍼 */
export function encryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return encrypt(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return decrypt(value);
}
