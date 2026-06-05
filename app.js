const BASE_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

// Select elements
const themeToggle = document.getElementById("theme-toggle");
const form = document.getElementById("converter-form");
const amountInput = document.getElementById("amount");
const currencySymbol = document.querySelector(".currency-symbol");
const swapBtn = document.getElementById("swap-btn");
const msg = document.querySelector(".msg");
const updateTime = document.getElementById("update-time");
const btnLoader = document.querySelector(".btn-loader");
const conversionsGrid = document.getElementById("conversions-grid");
const toast = document.getElementById("toast");
const toastMsg = document.querySelector(".toast-msg");
const toastClose = document.getElementById("toast-close");

// Native hidden selects
const nativeFrom = document.getElementById("native-from");
const nativeTo = document.getElementById("native-to");

// Custom select elements
const fromSelected = document.getElementById("from-selected");
const toSelected = document.getElementById("to-selected");
const fromListWrapper = document.getElementById("from-list-wrapper");
const toListWrapper = document.getElementById("to-list-wrapper");

// State
let ratesCache = {};
let activeDropdown = null;

// Currency symbols helper
const currencySymbols = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CAD: "C$", AUD: "A$",
  CNY: "¥", RUB: "₽", BRL: "R$", SGD: "S$", HKD: "HK$", CHF: "CHF"
};

// Initialize Theme
const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const icon = themeToggle.querySelector("i");
  if (savedTheme === "light") {
    icon.className = "fa-solid fa-moon";
  } else {
    icon.className = "fa-solid fa-sun";
  }
};

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  
  const icon = themeToggle.querySelector("i");
  icon.className = newTheme === "light" ? "fa-solid fa-moon" : "fa-solid fa-sun";
});

// Toast Notifications
const showToast = (message) => {
  toastMsg.innerText = message;
  toast.classList.add("show");
  
  // Auto-hide after 4 seconds
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
};

toastClose.addEventListener("click", () => {
  toast.classList.remove("show");
});

// Update input prefix currency symbol based on current base selection
const updateAmountPrefix = (currencyCode) => {
  currencySymbol.innerText = currencySymbols[currencyCode] || "";
};

// Initialize Options
const initNativeSelects = () => {
  [nativeFrom, nativeTo].forEach(select => {
    select.innerHTML = "";
    for (let code in countryList) {
      let opt = document.createElement("option");
      opt.value = code;
      opt.innerText = code;
      if (select.id === "native-from" && code === "USD") opt.selected = true;
      if (select.id === "native-to" && code === "INR") opt.selected = true;
      select.appendChild(opt);
    }
  });
};

const initCustomDropdowns = () => {
  const fromList = fromListWrapper.querySelector(".options-list");
  const toList = toListWrapper.querySelector(".options-list");
  
  populateList(fromList, "USD", "from");
  populateList(toList, "INR", "to");
  
  setupDropdownEvents("from", fromSelected, fromListWrapper, nativeFrom);
  setupDropdownEvents("to", toSelected, toListWrapper, nativeTo);
};

const populateList = (listElement, selectedCode, type) => {
  listElement.innerHTML = "";
  for (let code in countryList) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("data-value", code);
    if (code === selectedCode) {
      li.classList.add("selected");
      li.setAttribute("aria-selected", "true");
    }
    
    const flagImg = document.createElement("img");
    flagImg.src = `https://flagsapi.com/${countryList[code]}/flat/64.png`;
    flagImg.alt = `${code} Flag`;
    flagImg.loading = "lazy";
    
    // Handle broken images
    flagImg.onerror = () => {
      flagImg.src = `https://placehold.co/64x64/2c3e50/ffffff?text=${code}`;
    };
    
    const textSpan = document.createElement("span");
    textSpan.innerText = code;
    
    li.appendChild(flagImg);
    li.appendChild(textSpan);
    listElement.appendChild(li);
  }
};

const setupDropdownEvents = (type, selectedBox, listWrapper, nativeSelect) => {
  const searchInput = listWrapper.querySelector(".search-input");
  const list = listWrapper.querySelector(".options-list");
  
  // Toggle Open/Close
  selectedBox.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeDropdown && activeDropdown !== listWrapper) {
      closeDropdown(activeDropdown);
    }
    
    const isHidden = listWrapper.classList.contains("hidden");
    if (isHidden) {
      openDropdown(selectedBox, listWrapper, searchInput);
    } else {
      closeDropdown(listWrapper);
    }
  });
  
  // Selection
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li || li.classList.contains("no-results")) return;
    
    const val = li.getAttribute("data-value");
    selectCurrency(type, val, selectedBox, listWrapper, nativeSelect);
  });
  
  // Search Filtering
  searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toUpperCase();
    const items = list.querySelectorAll("li:not(.no-results)");
    let visibleCount = 0;
    
    items.forEach(item => {
      const code = item.getAttribute("data-value");
      if (code.includes(filter)) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });
    
    // Check if there are no results
    let noResultsEl = list.querySelector(".no-results");
    if (visibleCount === 0) {
      if (!noResultsEl) {
        noResultsEl = document.createElement("li");
        noResultsEl.className = "no-results";
        noResultsEl.innerText = "No matches found";
        list.appendChild(noResultsEl);
      }
    } else if (noResultsEl) {
      noResultsEl.remove();
    }
  });
  
  // Prevent click inside search box from closing dropdown
  listWrapper.querySelector(".search-box").addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  // Keyboard Accessibility
  selectedBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openDropdown(selectedBox, listWrapper, searchInput);
    }
  });
  
  searchInput.addEventListener("keydown", (e) => {
    const visibleItems = Array.from(list.querySelectorAll("li:not(.no-results)")).filter(el => el.style.display !== "none");
    let highlightedIndex = visibleItems.findIndex(el => el.classList.contains("highlighted"));
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (visibleItems.length === 0) return;
      if (highlightedIndex !== -1) visibleItems[highlightedIndex].classList.remove("highlighted");
      highlightedIndex = (highlightedIndex + 1) % visibleItems.length;
      visibleItems[highlightedIndex].classList.add("highlighted");
      visibleItems[highlightedIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visibleItems.length === 0) return;
      if (highlightedIndex !== -1) visibleItems[highlightedIndex].classList.remove("highlighted");
      highlightedIndex = (highlightedIndex - 1 + visibleItems.length) % visibleItems.length;
      visibleItems[highlightedIndex].classList.add("highlighted");
      visibleItems[highlightedIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex !== -1) {
        const val = visibleItems[highlightedIndex].getAttribute("data-value");
        selectCurrency(type, val, selectedBox, listWrapper, nativeSelect);
      }
    } else if (e.key === "Escape") {
      closeDropdown(listWrapper);
      selectedBox.focus();
    }
  });
};

const openDropdown = (selectedBox, listWrapper, searchInput) => {
  listWrapper.classList.remove("hidden");
  selectedBox.classList.add("active");
  selectedBox.setAttribute("aria-expanded", "true");
  activeDropdown = listWrapper;
  
  // Clear search and reset highlights
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input"));
  searchInput.focus();
  
  // Reset scroll position to selected item
  const selectedItem = listWrapper.querySelector("li.selected");
  if (selectedItem) {
    selectedItem.classList.add("highlighted");
    selectedItem.scrollIntoView({ block: "nearest" });
  }
};

const closeDropdown = (listWrapper) => {
  listWrapper.classList.add("hidden");
  const selectBox = listWrapper.parentElement.querySelector(".selected-option");
  selectBox.classList.remove("active");
  selectBox.setAttribute("aria-expanded", "false");
  
  // Remove all highlights
  listWrapper.querySelectorAll("li.highlighted").forEach(el => el.classList.remove("highlighted"));
  
  if (activeDropdown === listWrapper) {
    activeDropdown = null;
  }
};

const selectCurrency = (type, val, selectedBox, listWrapper, nativeSelect) => {
  // Update selected class in list
  listWrapper.querySelectorAll("li.selected").forEach(el => {
    el.classList.remove("selected");
    el.removeAttribute("aria-selected");
  });
  const newSelectedLi = listWrapper.querySelector(`li[data-value="${val}"]`);
  if (newSelectedLi) {
    newSelectedLi.classList.add("selected");
    newSelectedLi.setAttribute("aria-selected", "true");
  }
  
  // Update native select
  nativeSelect.value = val;
  nativeSelect.dispatchEvent(new Event("change"));
  
  // Update Custom Select Box UI
  selectedBox.querySelector(".currency-code").innerText = val;
  selectedBox.querySelector("img").src = `https://flagsapi.com/${countryList[val]}/flat/64.png`;
  
  if (type === "from") {
    updateAmountPrefix(val);
  }
  
  closeDropdown(listWrapper);
  
  // Trigger update
  updateExchangeRate();
};

const updateCustomSelectUI = (type, val, selectedBox, listWrapper) => {
  selectedBox.querySelector(".currency-code").innerText = val;
  selectedBox.querySelector("img").src = `https://flagsapi.com/${countryList[val]}/flat/64.png`;
  
  listWrapper.querySelectorAll("li.selected").forEach(el => {
    el.classList.remove("selected");
    el.removeAttribute("aria-selected");
  });
  
  const newSelectedLi = listWrapper.querySelector(`li[data-value="${val}"]`);
  if (newSelectedLi) {
    newSelectedLi.classList.add("selected");
    newSelectedLi.setAttribute("aria-selected", "true");
  }
};

// Close dropdowns when clicking outside
document.addEventListener("click", () => {
  if (activeDropdown) {
    closeDropdown(activeDropdown);
  }
});

// Cache Fetch Rates function
const fetchRates = async (baseCurrency) => {
  const lowerBase = baseCurrency.toLowerCase();
  
  // Memory Cache checking (valid for 2 minutes)
  const cached = ratesCache[lowerBase];
  if (cached && (Date.now() - cached.timestamp < 120000)) {
    return cached.rates;
  }
  
  const URL = `${BASE_URL}/${lowerBase}.json`;
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates for ${baseCurrency}`);
  }
  const data = await response.json();
  
  // Cache the rates response
  const rates = data[lowerBase];
  ratesCache[lowerBase] = {
    rates: rates,
    timestamp: Date.now()
  };
  
  return rates;
};

// Render Popular Conversions Dashboard
const renderPopularConversions = (base, amount, rates) => {
  conversionsGrid.innerHTML = "";
  const popular = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];
  
  // Select up to 4 popular currencies, skipping current base
  const targets = popular.filter(curr => curr !== base).slice(0, 4);
  
  targets.forEach(target => {
    const rate = rates[target.toLowerCase()];
    if (!rate) return;
    
    const total = (amount * rate).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const card = document.createElement("div");
    card.className = "grid-card";
    
    const flagSrc = `https://flagsapi.com/${countryList[target]}/flat/64.png`;
    
    card.innerHTML = `
      <div class="grid-card-currency">
        <img src="${flagSrc}" alt="${target} Flag" onerror="this.src='https://placehold.co/64x64/2c3e50/ffffff?text=${target}'" />
        <span>${target}</span>
      </div>
      <div class="grid-card-val">${total}</div>
    `;
    
    conversionsGrid.appendChild(card);
  });
};

// Main calculation logic
const updateExchangeRate = async () => {
  let amtVal = parseFloat(amountInput.value);
  if (isNaN(amtVal) || amtVal <= 0) {
    showToast("Please enter a valid amount greater than 0");
    amtVal = 1;
    amountInput.value = "1";
  }
  
  const fromVal = nativeFrom.value;
  const toVal = nativeTo.value;
  
  // Visual feedback
  btnLoader.classList.remove("hidden");
  msg.classList.add("updating");
  
  try {
    const rates = await fetchRates(fromVal);
    const rate = rates[toVal.toLowerCase()];
    
    if (!rate) {
      throw new Error(`Could not find conversion rate for ${fromVal} to ${toVal}`);
    }
    
    const finalAmount = (amtVal * rate).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
    
    msg.innerText = `${amtVal.toLocaleString()} ${fromVal} = ${finalAmount} ${toVal}`;
    
    const now = new Date();
    updateTime.innerText = `Rates updated today at ${now.toLocaleTimeString()}`;
    
    renderPopularConversions(fromVal, amtVal, rates);
  } catch (error) {
    console.error(error);
    showToast("Failed to fetch exchange rates. Try checking your internet connection.");
    msg.innerText = "Fetch failed";
    
    // Clear popular conversions grid
    conversionsGrid.innerHTML = `
      <div class="grid-card" style="grid-column: span 2; text-align: center; color: var(--text-muted);">
        Failed to load popular conversions.
      </div>
    `;
  } finally {
    btnLoader.classList.add("hidden");
    msg.classList.remove("updating");
  }
};

// Swap button logic
swapBtn.addEventListener("click", () => {
  // Trigger rotation transition in CSS
  swapBtn.classList.toggle("rotate");
  
  // Swap values
  const temp = nativeFrom.value;
  nativeFrom.value = nativeTo.value;
  nativeTo.value = temp;
  
  const fromVal = nativeFrom.value;
  const toVal = nativeTo.value;
  
  updateCustomSelectUI("from", fromVal, fromSelected, fromListWrapper);
  updateCustomSelectUI("to", toVal, toSelected, toListWrapper);
  
  updateAmountPrefix(fromVal);
  updateExchangeRate();
});

// Form submission handler
form.addEventListener("submit", (evt) => {
  evt.preventDefault();
  updateExchangeRate();
});

// App initialization on load
window.addEventListener("load", () => {
  initNativeSelects();
  initCustomDropdowns();
  initTheme();
  updateAmountPrefix(nativeFrom.value);
  updateExchangeRate();
});
