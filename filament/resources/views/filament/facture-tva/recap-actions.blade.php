<div class="ftva-recap-actions">
  <button type="button"
          class="ftva-btn ftva-btn-primary"
          x-on:click="$dispatch('filament-form-submit')">
    Enregistrer les modifications
  </button>

  <a class="ftva-btn ftva-btn-ghost" href="{{ url()->previous() }}">
    Annuler
  </a>
</div>

