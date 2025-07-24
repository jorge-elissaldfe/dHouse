<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Selector de Imágenes</title>
  <style>
    /* Estilos del modal */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0; top: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .modal-content {
      background-color: #fff;
      margin: 10% auto;
      padding: 20px;
      width: 80%;
      max-width: 800px;
      border-radius: 10px;
    }

    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }
    .gallery img {
      width: 150px;
      height: auto;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .gallery img.selected {
      border-color: blue;
    }

    #openModalBtn {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <h1>Galería de Imágenes</h1>
  <button id="openModalBtn">Seleccionar imagen</button>
  <p>Imagen seleccionada: <span id="selected-name">ninguna</span></p>

  <!-- Modal -->
  <div id="imageModal" class="modal">
    <div class="modal-content">
      <h2>Elige una imagen</h2>
      <div class="gallery" id="gallery">
        <?php
          $imagenes = glob("img/devices/*.png");
          foreach ($imagenes as $imagen) {
            $nombre = basename($imagen);
            echo "<img style='width: 24px' src='$imagen' alt='$nombre' data-nombre='$nombre'>";
          }
        ?>
      </div>
    </div>
  </div>

  <script>
    const modal = $("imageModal");
    const openBtn = $("openModalBtn");
    const selectedNameSpan = $("selected-name");
    const images = document.querySelectorAll(".gallery img");

    let selected = null;

    openBtn.onclick = () => {
      modal.style.display = "block";
    };

    images.forEach(img => {
      img.addEventListener("click", () => {
        if (selected) selected.classList.remove("selected");
        img.classList.add("selected");
        selected = img;
        selectedNameSpan.textContent = img.getAttribute("data-nombre");
        modal.style.display = "none"; // cerrar el modal
      });
    });

    // Cierra el modal si el usuario hace clic fuera del contenido
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  </script>

</body>
</html>

