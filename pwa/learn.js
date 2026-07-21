// Prompty trybów uczących (My Story / Linglerno) pochodzą teraz z jednego
// wspólnego źródła (pwa/prompt.js = kopia src/shared/prompt.js), żeby PWA i
// rozszerzenie działały identycznie. Ten plik jest tylko re-eksportem.
export {
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  buildLingoSystemPrompt,
  buildLingoUserPrompt,
} from "./prompt.js";
