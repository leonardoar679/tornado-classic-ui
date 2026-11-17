<template>
  <div class="wrapper geofence">
    <nav class="navbar header" role="navigation" aria-label="main navigation">
      <div class="container">
        <div class="navbar-brand">
          <NuxtLink to="/" active-class="" class="navbar-item">
            <Logo />
          </NuxtLink>
        </div>
      </div>
    </nav>
    <section class="main-content section">
      <div class="container">
        <slot />
      </div>
    </section>
    <Footer />
  </div>
</template>

<script>
import Logo from '@/components/Logo.vue'
import Footer from '@/components/Footer.vue'

export default {
  components: {
    Logo,
    Footer
  }
}
</script>
