/**
 * Extend the GamePause application to use custom banner.
 * @extends {GamePause}
 */
export class SynthicideGamePause extends foundry.applications.ui.GamePause {
  /** @override */
  async _renderHTML(context, _options) {
    const img = document.createElement("img");
    img.src = "systems/synthicide/assets/synthicidePause.svg";
    if ( context.spin ) {
      img.classList.add("fa-spin");
    }
    const caption = document.createElement("figcaption");
    caption.innerText = context.text;
    const figure = document.createElement("figure");
    figure.appendChild(img);
    figure.appendChild(caption);
    return [figure, caption];
  }
}
