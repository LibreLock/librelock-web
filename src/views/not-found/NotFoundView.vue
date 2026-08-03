<script setup lang="ts"></script>

<template>
  <section
    class="flex h-full items-center justify-center overflow-auto bg-gray-50 dark:bg-gray-950 p-4"
  >
    <div class="text-center">
      <h1 class="text-5xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <p class="mt-2 text-md text-gray-600 dark:text-gray-400">Page not found</p>
      <div class="">
        <RouterLink
          to="/"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >Go to vault
        </RouterLink>
      </div>
    </div>
  </section>
</template>
