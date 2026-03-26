<template>
  <div class="reparse-trigger">
    <n-tooltip trigger="hover" :z-index="9999999">
      <template #trigger>
        <i class="iconfont ri-refresh-line"></i>
      </template>
      刷新
    </n-tooltip>
  </div>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.reparse-trigger {
  @apply cursor-pointer hover:text-green-500 transition-colors;
}
.iconfont {
  @apply text-2xl mx-3;
}
</style>
