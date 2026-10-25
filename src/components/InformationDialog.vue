<script setup lang="ts">
import { nextTick, ref } from 'vue';

const emit = defineEmits<{ closed: [] }>();
const dialog = ref<HTMLDialogElement>();

function open(section?: 'privacy') {
  dialog.value?.showModal();
  if (section === 'privacy') {
    nextTick(() => dialog.value?.querySelector<HTMLElement>('#privacy-heading')?.focus());
  }
}
function close() {
  dialog.value?.close();
}

defineExpose({ open, close });
</script>

<template>
  <dialog
    ref="dialog"
    class="help-dialog information-dialog"
    aria-labelledby="information-heading"
    @click="(event) => event.target === dialog && close()"
    @close="emit('closed')"
  >
    <button class="icon-button dialog-close" type="button" aria-label="Chiudi" @click="close">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    </button>
    <span class="eyebrow">UN PO’ PIÙ DA VICINO</span>
    <h2 id="information-heading">Il resto</h2>

    <section>
      <h3>Come funziona</h3>
      <p>
        Completa una frase con il verbo indicato. Premi <strong>Invio</strong> per verificare e,
        quando vuoi, per continuare. Con <strong>↑</strong> e <strong>↓</strong> puoi rivedere le
        frasi della sessione.
      </p>
      <p>
        Dopo il risultato, la frase successiva arriva da sé. Scegli <strong>Resta qui</strong> se
        vuoi più tempo per rileggere la spiegazione.
      </p>
      <p>
        Gli errori tornano dopo qualche frase. La pratica si adatta poco alla volta a ciò che
        riconosci con sicurezza e a ciò che merita ancora un giro.
      </p>
    </section>

    <section>
      <h3>Perché esiste</h3>
      <p>
        Studio italiano anch’io e mi mancava un modo piacevole, informale e magari anche divertente
        per esercitare le coniugazioni: una cosa che richiede soprattutto ripetizione.
      </p>
      <p>
        Sono un ingegnere del software brasiliano, vivo negli Stati Uniti e ho origini italiane.
        Questo piccolo spazio nasce dall’incontro fra queste parti della mia storia.
      </p>
    </section>

    <section aria-labelledby="privacy-heading">
      <h3 id="privacy-heading" tabindex="-1">Privacy</h3>
      <p>
        Il nome, le preferenze, i progressi e le risposte restano in questo browser. Non servono un
        account e il server dell’app non riceve ciò che scrivi. Se cancelli i dati del sito, perdi
        anche i progressi salvati qui.
      </p>
      <p>
        Usiamo Umami, senza cookie, per raccogliere statistiche aggregate sulle visite e su quante
        volte vengono avviate o concluse le sessioni, o verificate risposte corrette, quasi corrette
        e sbagliate. Questi eventi non includono il tuo nome né il testo delle risposte.
      </p>
    </section>

    <a
      class="linkedin-link"
      href="https://www.linkedin.com/in/ricardo-boni-9b15744/"
      target="_blank"
      rel="noreferrer"
      aria-label="Profilo LinkedIn dell’autore (si apre in una nuova scheda)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6.4 8.2H3.2V21h3.2V8.2ZM4.8 3A1.9 1.9 0 1 0 4.8 6.8 1.9 1.9 0 0 0 4.8 3ZM21 13.7c0-3.9-2.1-5.8-4.9-5.8-2.3 0-3.3 1.2-3.8 2.1V8.2H9.1V21h3.2v-6.3c0-1.7.3-3.3 2.4-3.3s2.1 1.9 2.1 3.4V21H20v-7.3Z"
        />
      </svg>
    </a>
  </dialog>
</template>
