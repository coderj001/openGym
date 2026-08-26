import de from '../locales/de';
import es from '../locales/es';
import fr from '../locales/fr';
import hi from '../locales/hi';
import it from '../locales/it';
import ko from '../locales/ko';
import pl from '../locales/pl';
import pt from '../locales/pt';
import ru from '../locales/ru';
import tr from '../locales/tr';
import zh from '../locales/zh';
import esInstr from '../instr/es';
import frInstr from '../instr/fr';
import hiInstr from '../instr/hi';
import itInstr from '../instr/it';
import koInstr from '../instr/ko';
import plInstr from '../instr/pl';
import ruInstr from '../instr/ru';
import trInstr from '../instr/tr';
import zhInstr from '../instr/zh';

export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी',
};
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko'];
const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN',
};
const DICTS = { de, es, fr, hi, it, ko, pl, pt, ru, tr, zh };
const INSTRUCTIONS = { es: esInstr, fr: frInstr, hi: hiInstr, it: itInstr, ko: koInstr, pl: plInstr, ru: ruInstr, tr: trInstr, zh: zhInstr };
let lang = 'en';

export const setLang = value => { lang = LANGS[value] ? value : 'en'; };
export const getLang = () => lang;
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB';
export function t(source, ...args) {
  let value = DICTS[lang]?.[source] || source;
  args.forEach((arg, index) => { value = value.replaceAll(`{${index}}`, String(arg)); });
  return value;
}
export const instrFor = exercise => INSTRUCTIONS[lang]?.[exercise.id] || exercise.st || [];
