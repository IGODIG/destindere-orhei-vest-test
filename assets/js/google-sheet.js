function initGoogleSheet() {
  const form = document.getElementById("registrationForm");

  const guestSelect = document.getElementById("guestSelect");

  if (!form && !guestSelect && !document.getElementById("foodProgress") && !document.getElementById("invited")) return;

  const scriptURL = CONFIG.apiUrl;

  // ==========================================
  // FUNCȚIE STATISTICI
  // ==========================================

  function setVal(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  // ==========================================
  // ACTUALIZARE PRODUSE
  // ==========================================

  function normalizeProductName(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase("ro-RO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function toNumber(value) {
    if (typeof value === "object" && value !== null) {
      value = value.adus ?? value.current ?? value.quantity ?? value.cantitate ?? value.total ?? value.value ?? value.valoare;
    }
    if (typeof value === "string") {
      value = value.replace(/\s/g, "").replace(",", ".");
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function getProductsData(data) {
    if (!data) return {};
    return data.produse || data.products || data.food || {};
  }

  function getCurrentForProduct(produse, productId, productName) {
    if (!produse) return 0;

    const targetId = String(productId || "").trim();
    const target = normalizeProductName(productName);

    // Format obiect recomandat: { "food_001": 6, "food_002": 4 }
    if (!Array.isArray(produse) && typeof produse === "object") {
      if (targetId && Object.prototype.hasOwnProperty.call(produse, targetId)) return toNumber(produse[targetId]);
      const key = Object.keys(produse).find(function (key) {
        return normalizeProductName(key) === target;
      });
      if (key !== undefined) return toNumber(produse[key]);
    }

    // Format array recomandat: [{id:"food_001", name:"Suc", adus:6}, ...]
    if (Array.isArray(produse)) {
      const row = produse.find(function (item) {
        if (!item || typeof item !== "object") return false;
        if (targetId && String(item.id ?? item.productId ?? item.produsId ?? "").trim() === targetId) return true;
        return normalizeProductName(item.name ?? item.nume ?? item.produs ?? item.product) === target;
      });
      if (row) return toNumber(row);
    }

    return 0;
  }

  function updateFoodProgress(produse) {
    const foodItems = document.querySelectorAll("#foodProgress .food-card");
    if (!foodItems.length) return;

    foodItems.forEach(function (item) {
      const productName = item.dataset.productName || "";
      const productId = item.dataset.productId || "";
      const configProduct = (CONFIG.food?.products || []).find(function (product) {
        return (product.id && product.id === productId) || normalizeProductName(product.name) === normalizeProductName(productName);
      });

      if (!configProduct) return;

      const current = getCurrentForProduct(produse, productId, productName);
      const required = toNumber(configProduct.required);
      const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;
      const rounded = Math.round(percentage);

      const numberElement = item.querySelector(".food-progress-number");
      const progressBar = item.querySelector(".food-progress-bar");
      const progress = item.querySelector(".food-progress");
      const label = item.querySelector(".food-progress-label");

      if (numberElement) numberElement.textContent = current + " / " + required + (configProduct.unit ? " " + configProduct.unit : "");
      if (progressBar) progressBar.style.width = rounded + "%";
      if (progress) progress.setAttribute("aria-valuenow", String(rounded));

      const complete = current >= required && required > 0;
      if (complete) {
        if (label) label.textContent = "COMPLET";
        item.classList.add("is-complete");
        item.hidden = CONFIG.food?.hideCompleted === true;
      } else {
        if (label) label.textContent = "PROGRES";
        item.classList.remove("is-complete");
        item.hidden = false;
      }

    });
  }

  // ==========================================
  // ÎNCĂRCARE DATE
  // ==========================================

  function populateProductSelects(produse) {
    const products = (CONFIG.food?.products || []).filter(function(product) {
      return product && product.enabled !== false && product.id;
    });

    const hideCompleted = CONFIG.food?.hideCompleted === true;

    // Folosim aceeași sursă de date ca bara de progres.
    // Astfel, un produs completat nu mai apare nici în dropdown
    // atunci când opțiunea "Ascunde produsele completate" este activă.
    const availableProducts = products.filter(function(product) {
      if (!hideCompleted) return true;

      const current = getCurrentForProduct(produse, product.id, product.name);
      const required = toNumber(product.required);

      return !(required > 0 && current >= required);
    });

    document.querySelectorAll('select[data-product-select], select[name^="productId"]').forEach(function(select) {
      const current = select.value;
      const isFirst = select.name === "productId1";
      select.innerHTML = '<option value="">' +
        (availableProducts.length
          ? (isFirst ? "Ce dorești să aduci?" : "Ce dorești să mai aduci?")
          : "Toate produsele sunt completate") +
        '</option>';

      availableProducts.forEach(function(product) {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name + (product.unit ? " (" + product.unit + ")" : "");
        select.appendChild(option);
      });

      if (current && availableProducts.some(function(product) {
        return product.id === current;
      })) {
        select.value = current;
      }
    });
  }

  function loadData() {
    const eventId = CONFIG.event?.eventId || "";
    const url = new URL(scriptURL);
    url.searchParams.set("eventId", eventId);
    fetch(url.toString())
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        return response.json();
      })

      .then(function (data) {
        console.log("Date Google Sheets:", data);

        // Backend-ul este sursa de adevăr pentru evenimentul ACTIV.
        // Folosim eventId din răspuns chiar dacă configurația paginii nu îl conține încă.
        if (data.eventId) {
          CONFIG.event = CONFIG.event || {};
          CONFIG.event.eventId = data.eventId;
        }

        populateProductSelects(getProductsData(data));

        // ==========================================
        // INVITAȚI
        // ==========================================

        if (guestSelect && Array.isArray(data.nume)) {
          guestSelect.innerHTML = '<option value="">Alege numele...</option>';

          data.nume.forEach(function (nume) {
            if (nume && String(nume).trim() !== "") {
              const option = document.createElement("option");

              option.value = nume;

              option.textContent = nume;

              guestSelect.appendChild(option);
            }
          });
        }

        // ==========================================
        // STATISTICI
        // ==========================================

        if (data.stats) {
          setVal("invited", data.stats.invited);

          setVal("confirmed", data.stats.confirmed);

          setVal("declined", data.stats.declined);

          setVal("waiting", data.stats.waiting);

          setVal("persons", data.stats.persons);
        }

        // ==========================================
        // PRODUSE
        // ==========================================

        updateFoodProgress(getProductsData(data));
      })

      .catch(function (error) {
        console.error("Eroare Google Sheets:", error);
      });
  }

  // Încărcăm datele
  loadData();

  // ==========================================
  // TRIMITERE FORMULAR
  // ==========================================

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');

      if (!submitButton) {
        return;
      }

      const originalText = submitButton.innerText;

      submitButton.innerText = "Se trimite...";

      submitButton.disabled = true;

      // ==========================================
      // DATE FORMULAR
      // ==========================================

      const formData = new FormData(form);
      const eventId = CONFIG.event?.eventId || "";
      if (eventId) {
        formData.append("eventId", eventId);
      }

      // ==========================================
      // GOOGLE APPS SCRIPT
      // ==========================================

      fetch(scriptURL, {
        method: "POST",
        body: formData,
      })
        .then(function (response) {
          return response.json();
        })

        .then(function (result) {
          console.log("Răspuns Google Apps Script:", result);

          // ==========================================
          // IMPORTANT:
          // doPost() returnează success: true
          // NU result: "success"
          // ==========================================

          if (result.success === true) {
            alert("Te-ai înregistrat cu succes!");

            form.reset();

            loadData();
          } else {
            alert(
              "A apărut o eroare: " +
                (result.error || result.message || "Eroare necunoscută"),
            );
          }
        })

        .catch(function (error) {
          console.error("Eroare trimitere:", error);

          alert("Nu am putut trimite datele.");
        })

        .finally(function () {
          submitButton.innerText = originalText;

          submitButton.disabled = false;
        });
    });
  }
}

window.addEventListener("DOMContentLoaded", initGoogleSheet);
window.addEventListener("site:rendered", initGoogleSheet);