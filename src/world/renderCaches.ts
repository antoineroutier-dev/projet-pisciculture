import * as T from "three";
/** Three r186's shared DFG lookup texture is kept outside scene materials.
 * Its dispose listeners otherwise retain each retired renderer. Collect only
 * that known uniform while material properties still exist, before disposal.
 * The application owns one renderer at a time; Three uploads the LUT again
 * when the next session uses it. Covered by real context-loss/recovery tests.
 */
export function disposeRenderCaches(renderer: T.WebGLRenderer, scene: T.Scene) {
  const textures = new Set<T.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      const properties = renderer.properties.get(material) as {
        uniforms?: { dfgLUT?: { value: unknown } };
      };
      const value = properties.uniforms?.dfgLUT?.value;
      if (value instanceof T.Texture && value.name === "DFG_LUT")
        textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
}
