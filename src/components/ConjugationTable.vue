<script setup lang="ts">
import { normalize, persons, tenseLabels } from '../lib/practice.ts';
import { computed } from 'vue';
import type { Exercise, Verb, Tense } from '../lib/practice.ts';
const props = defineProps<{ verb: Verb; exercise: Exercise; answer: string; tense: Tense }>();
const rows = computed(() =>
  props.verb.paradigms![props.tense].map((forms, index) => {
    // The target row respects the sentence's explicit gender/context restrictions.
    const accepted = props.exercise.acceptedAnswers
      ?.filter((a) => a.tense === props.tense)
      .map((a) => a.text);
    return persons[index] === props.exercise.person && accepted?.length ? accepted : forms;
  }),
);
const supplied = (index: number) =>
  rows.value[index]!.some((form) => normalize(form) === normalize(props.answer));
</script>
<template>
  <div class="conjugation">
    <div class="table-heading">
      <span>{{ verb.id }}</span
      ><span>{{ tenseLabels[tense] }}</span>
    </div>
    <table>
      <caption class="sr-only">
        Coniugazione di
        {{
          verb.id
        }}
        —
        {{
          tenseLabels[tense]
        }}
      </caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">Persona</th>
          <th scope="col">Forma</th>
          <th scope="col">Indicazione</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(person, index) in persons"
          :key="person"
          :class="{
            'target-row': person === exercise.person,
            'supplied-row': person !== exercise.person && supplied(index),
          }"
        >
          <th scope="row">{{ person }}</th>
          <td class="conjugation-forms">
            <span v-for="form in rows[index]" :key="form" class="conjugation-form">{{ form }}</span>
          </td>
          <td
            class="row-note"
            :aria-label="
              person === exercise.person
                ? 'forma corretta'
                : supplied(index)
                  ? 'la tua risposta'
                  : undefined
            "
          >
            <template v-if="person === exercise.person"
              ><span class="row-note-text">forma corretta</span>
              <span aria-hidden="true">✓</span></template
            ><template v-else-if="supplied(index)"
              ><span class="row-note-text">la tua risposta</span>
              <span aria-hidden="true">×</span></template
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
