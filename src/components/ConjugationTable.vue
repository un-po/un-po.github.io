<script setup lang="ts">
import { normalize, persons } from '../lib/practice.ts';
import type { Exercise, Verb } from '../lib/practice.ts';
defineProps<{ verb: Verb; exercise: Exercise; answer: string }>();
</script>
<template>
  <div class="conjugation">
    <div class="table-heading">
      <span>{{ verb.id }}</span
      ><span>Presente indicativo</span>
    </div>
    <table>
      <caption class="sr-only">
        Coniugazione di
        {{
          verb.id
        }}
        al presente indicativo
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
            'supplied-row':
              person !== exercise.person && normalize(verb.forms[index]!) === normalize(answer),
          }"
        >
          <th scope="row">{{ person }}</th>
          <td>{{ verb.forms[index] }}</td>
          <td class="row-note">
            <template v-if="person === exercise.person"
              >forma corretta <span aria-hidden="true">✓</span></template
            ><template v-else-if="normalize(verb.forms[index]!) === normalize(answer)"
              >la tua risposta <span aria-hidden="true">×</span></template
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
