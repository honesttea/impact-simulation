import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const carregador = new GLTFLoader();

// Materiais PBR do glTF trocados por Lambert, bem mais leves no Quest 2.
function materialLeve(original) {
  return new THREE.MeshLambertMaterial({ color: original.color, map: original.map, vertexColors: original.vertexColors });
}

// Partes do modelo com a transformacao ja aplicada na geometria, prontas para montar ou instanciar.
export async function carregarPartes(arquivo) {
  const { scene } = await carregador.loadAsync(`./assets/modelos/${arquivo}`);
  scene.updateMatrixWorld(true);
  const partes = [];
  scene.traverse((objeto) => {
    if (objeto.isMesh) {
      partes.push({ geometria: objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), material: materialLeve(objeto.material) });
    }
  });
  return partes;
}
