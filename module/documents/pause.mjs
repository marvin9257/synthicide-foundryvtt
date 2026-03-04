
/**
 * Extend the GamePause application to use custom banner.
 * @extends {GamePause}
 */
export class SynthicideGamePause extends foundry.applications.ui.GamePause {
  /** @override */
  async _renderHTML(context, _options) {
    const img = globalThis.document.createElement("img");
    img.src = "systems/synthicide/assets/synthicidePause.svg";
    if ( context.spin ) {
      img.classList.add("fa-spin");
    }
    const caption = globalThis.document.createElement("figcaption");
    caption.innerText = context.text;
    const figure = globalThis.document.createElement("figure");
    figure.appendChild(img);
    figure.appendChild(caption);
    return [figure, caption];
  }
}
