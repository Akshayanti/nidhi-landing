/**
 * Words a reader might type in their own language on the How-to hub, mapped to
 * the guide they should find. The guides are English; on /hi/how-to/,
 * /es/how-to/, /cs/how-to/ and /mr/how-to/ the hub's search adds these to each
 * guide's English search terms, and every result says the guide is in English.
 *
 * A small set the council reviewed (Nov 10, 2026), not a translation of the
 * guides. Keys are guide slugs; the build fails on a slug that is no guide.
 * Coverage is reviewed at about 25 guides. English needs none: the guides'
 * own `searchTerms` cover it.
 *
 * Outside the catalogs on purpose: languages need not list the same guides or
 * the same number of phrases, which the catalog parity test would forbid.
 */
import type { Locale } from '../config.ts';

export type GuideAliases = Record<string, string[]>;

export const HOW_TO_ALIASES: Partial<Record<Locale, GuideAliases>> = {
  hi: {
    'will-my-money-last-until-payday': ['तनख़्वाह तक पैसे', 'सैलरी तक पैसे', 'महीने का खर्च', 'महीना कैसे चलेगा'],
    'how-do-i-list-what-i-owe': ['कर्ज़ों की सूची', 'कर्ज़', 'उधार', 'लोन की सूची'],
    'what-does-the-minimum-payment-on-my-credit-card-mean': ['क्रेडिट कार्ड', 'न्यूनतम भुगतान', 'मिनिमम ड्यू', 'कार्ड का बिल'],
    'how-do-i-compare-money-transfer-quotes': ['पैसे भेजना', 'विदेश पैसे भेजना', 'मनी ट्रांसफर', 'विनिमय दर'],
    'how-can-i-check-a-suspicious-money-message': ['धोखाधड़ी', 'फ्रॉड', 'संदिग्ध मैसेज', 'ओटीपी'],
    'how-do-i-work-out-my-net-worth': ['नेट वर्थ', 'शुद्ध संपत्ति', 'संपत्ति और कर्ज़'],
    'how-do-i-compare-two-loan-offers': ['लोन की तुलना', 'लोन ऑफ़र', 'ब्याज दर', 'प्रोसेसिंग फ़ीस'],
    'what-does-a-zero-percent-instalment-plan-really-cost': ['नो कॉस्ट ईएमआई', 'ईएमआई', 'किस्तें', 'बाय नाउ पे लेटर'],
    'how-do-i-work-out-a-month-of-essential-costs': ['ज़रूरी खर्च', 'बुनियादी खर्च', 'महीने के ज़रूरी खर्च'],
    'how-much-will-the-same-shopping-cost-after-inflation': ['महँगाई', 'बढ़ती कीमतें', 'मुद्रास्फीति'],
    'how-do-i-list-my-accounts-and-regular-payments': ['बैंक खाते', 'खातों की सूची', 'सब्सक्रिप्शन', 'ऑटो डेबिट'],
    'how-can-i-check-a-money-website-is-real': ['नकली वेबसाइट', 'फ़र्ज़ी वेबसाइट', 'असली वेबसाइट'],
  },
  es: {
    'will-my-money-last-until-payday': ['llegar a fin de mes', 'hasta el día de cobro', 'sueldo', 'quincena'],
    'how-do-i-list-what-i-owe': ['deudas', 'lista de deudas', 'cuánto debo', 'préstamos'],
    'what-does-the-minimum-payment-on-my-credit-card-mean': ['tarjeta de crédito', 'pago mínimo', 'extracto de la tarjeta'],
    'how-do-i-compare-money-transfer-quotes': ['enviar dinero', 'remesas', 'transferencia internacional', 'tipo de cambio'],
    'how-can-i-check-a-suspicious-money-message': ['estafa', 'fraude', 'mensaje sospechoso', 'código de verificación'],
    'how-do-i-work-out-my-net-worth': ['patrimonio neto', 'cuánto tengo', 'activos y deudas'],
    'how-do-i-compare-two-loan-offers': ['comparar préstamos', 'oferta de préstamo', 'TAE', 'comisión de apertura'],
    'what-does-a-zero-percent-instalment-plan-really-cost': ['meses sin intereses', 'pagar a plazos', 'compra ahora paga después', 'cuotas sin interés'],
    'how-do-i-work-out-a-month-of-essential-costs': ['gastos básicos', 'gastos esenciales', 'gastos del mes'],
    'how-much-will-the-same-shopping-cost-after-inflation': ['inflación', 'subida de precios', 'poder adquisitivo'],
    'how-do-i-list-my-accounts-and-regular-payments': ['cuentas bancarias', 'suscripciones', 'domiciliaciones', 'pagos recurrentes'],
    'how-can-i-check-a-money-website-is-real': ['web falsa', 'página falsa', 'sitio web falso'],
  },
  cs: {
    'will-my-money-last-until-payday': ['vyjít do výplaty', 'do výplaty', 'výplata', 'měsíční výdaje'],
    'how-do-i-list-what-i-owe': ['dluhy', 'seznam dluhů', 'kolik dlužím', 'půjčky'],
    'what-does-the-minimum-payment-on-my-credit-card-mean': ['kreditní karta', 'minimální splátka', 'výpis z karty'],
    'how-do-i-compare-money-transfer-quotes': ['poslat peníze do zahraničí', 'převod do zahraničí', 'směnný kurz'],
    'how-can-i-check-a-suspicious-money-message': ['podvod', 'podezřelá zpráva', 'phishing', 'ověřovací kód'],
    'how-do-i-work-out-my-net-worth': ['čisté jmění', 'majetek a dluhy', 'kolik mám'],
    'how-do-i-compare-two-loan-offers': ['porovnat půjčky', 'nabídka půjčky', 'RPSN', 'poplatek za sjednání'],
    'what-does-a-zero-percent-instalment-plan-really-cost': ['splátky bez navýšení', 'nákup na splátky', 'kup teď, zaplať později', 'nakup teď, zaplať později'],
    'how-do-i-work-out-a-month-of-essential-costs': ['nezbytné výdaje', 'měsíční náklady', 'základní výdaje'],
    'how-much-will-the-same-shopping-cost-after-inflation': ['inflace', 'zdražování', 'kupní síla'],
    'how-do-i-list-my-accounts-and-regular-payments': ['bankovní účty', 'předplatné', 'inkaso', 'trvalé příkazy'],
    'how-can-i-check-a-money-website-is-real': ['falešný web', 'podvodný web', 'pravý web'],
  },
  mr: {
    'will-my-money-last-until-payday': ['पगारापर्यंत पैसे', 'पगार', 'महिन्याचा खर्च'],
    'how-do-i-list-what-i-owe': ['कर्जांची यादी', 'कर्ज', 'उधारी', 'लोन'],
    'what-does-the-minimum-payment-on-my-credit-card-mean': ['क्रेडिट कार्ड', 'किमान देय रक्कम', 'कार्डचे बिल'],
    'how-do-i-compare-money-transfer-quotes': ['परदेशात पैसे पाठवणे', 'मनी ट्रान्सफर', 'विनिमय दर'],
    'how-can-i-check-a-suspicious-money-message': ['फसवणूक', 'फ्रॉड', 'संशयास्पद संदेश', 'ओटीपी'],
    'how-do-i-work-out-my-net-worth': ['निव्वळ संपत्ती', 'नेट वर्थ', 'मालमत्ता आणि कर्ज'],
    'how-do-i-compare-two-loan-offers': ['लोनची तुलना', 'कर्जाची तुलना', 'व्याजदर', 'प्रोसेसिंग फी'],
    'what-does-a-zero-percent-instalment-plan-really-cost': ['नो कॉस्ट ईएमआय', 'ईएमआय', 'हप्ते', 'बाय नाऊ पे लेटर'],
    'how-do-i-work-out-a-month-of-essential-costs': ['आवश्यक खर्च', 'मूलभूत खर्च', 'महिन्याचे आवश्यक खर्च'],
    'how-much-will-the-same-shopping-cost-after-inflation': ['महागाई', 'वाढत्या किमती', 'चलनवाढ'],
    'how-do-i-list-my-accounts-and-regular-payments': ['बँक खाती', 'खात्यांची यादी', 'सबस्क्रिप्शन', 'ऑटो डेबिट'],
    'how-can-i-check-a-money-website-is-real': ['बनावट वेबसाइट', 'खोटी वेबसाइट', 'खरी वेबसाइट'],
  },
};
