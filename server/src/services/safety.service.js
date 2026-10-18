const MEDICAL_MESSAGE = {
  en: "Your description includes warning signs that may need urgent medical attention. Please call 112 (national emergency number) or 108 (ambulance) now, or go to the nearest emergency department. Do not wait for an online appointment.",
  hi: "आपके विवरण में ऐसे संकेत हैं जिनमें तुरंत चिकित्सा सहायता की ज़रूरत हो सकती है। कृपया अभी 112 (राष्ट्रीय आपातकालीन नंबर) या 108 (एम्बुलेंस) पर कॉल करें, या नज़दीकी अस्पताल के आपातकालीन विभाग जाएँ। ऑनलाइन अपॉइंटमेंट का इंतज़ार न करें।",
};

const MENTAL_HEALTH_MESSAGE = {
  en: "You are not alone, and help is available right now. Please talk to someone you trust and contact 112 or the Tele-MANAS helpline (14416) immediately. If you are in immediate danger, go to the nearest emergency department.",
  hi: "आप अकेले नहीं हैं, और मदद अभी उपलब्ध है। कृपया किसी भरोसेमंद व्यक्ति से बात करें और तुरंत 112 या Tele-MANAS हेल्पलाइन (14416) पर संपर्क करें। यदि आप तुरंत खतरे में हैं, तो नज़दीकी अस्पताल के आपातकालीन विभाग जाएँ।",
};

const PATTERNS = [
  // English
  { id: "chest_pain", category: "medical", re: /chest (pain|pressure|tightness)|pain in (my )?chest|heart attack/i },
  { id: "breathing", category: "medical", re: /(can'?t|cannot|unable to|difficulty|trouble|hard to|struggling to) breath(e|ing)?|short(ness)? of breath|gasping/i },
  { id: "stroke", category: "medical", re: /face (is )?droop|slurred speech|sudden (weakness|numbness)|one side of (my )?(body|face)/i },
  { id: "unconscious", category: "medical", re: /unconscious|passed out|fainted|unresponsive|collapsed/i },
  { id: "seizure", category: "medical", re: /seizure|convulsion/i },
  { id: "bleeding", category: "medical", re: /(heavy|severe|uncontrolled) bleeding|bleeding (that )?(won'?t|will not) stop|vomiting blood|coughing (up )?blood|blood in (my )?vomit/i },
  { id: "poison", category: "medical", re: /overdose|poison(ed|ing)|swallowed (bleach|poison)/i },
  { id: "allergy", category: "medical", re: /(throat|face|tongue|lips) (is |are )?(swelling|swollen)|anaphyla/i },
  { id: "suicide", category: "mental_health", re: /suicid|kill myself|end my life|want to die|self[- ]harm|hurt myself/i },
  // Hindi (Devanagari) and Hinglish
  { id: "hi_chest", category: "medical", re: /सीने (में )?(दर्द|जकड़न)|छाती (में )?दर्द|seene (me|mein) (dard|jalan)|chhati (me|mein) dard/i },
  { id: "hi_breath", category: "medical", re: /सा(ं|ँ)स (लेने )?(में )?(तकलीफ|दिक्कत)|saans (lene )?(me|mein) (takleef|dikkat)/i },
  { id: "hi_faint", category: "medical", re: /बेहोश|behosh/i },
  { id: "hi_seizure", category: "medical", re: /दौरा पड़|मिर्गी का दौरा|daura pad/i },
  { id: "hi_bleeding", category: "medical", re: /खून की उल्टी|बहुत (ज्यादा |ज़्यादा )?खून|khoon ki ulti|bahut khoon/i },
  { id: "hi_stroke", category: "medical", re: /लकवा|मुंह टेढ़ा|lakwa/i },
  { id: "hi_suicide", category: "mental_health", re: /आत्महत्या|मरना चाहता|मरना चाहती|atmahatya/i },
];

export function screenForEmergency(text) {
  const normalized = String(text).replace(/[’‘]/g, "'");
  const matched = PATTERNS.filter((p) => p.re.test(normalized));

  if (matched.length === 0) {
    return { isEmergency: false, matched: [], category: null, message: null };
  }

  const mentalOnly = matched.every((p) => p.category === "mental_health");
  return {
    isEmergency: true,
    matched: matched.map((p) => p.id),
    category: mentalOnly ? "mental_health" : "medical",
    message: mentalOnly ? MENTAL_HEALTH_MESSAGE : MEDICAL_MESSAGE,
  };
}