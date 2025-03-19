let chart = null;
function showConfiguration() {
  ["polarizacionFijaForm","autopolarizacion1Form","divisorVoltaje1Form","autopolarizacionMOSIncrementalForm","divisorVoltajeMOSIncrementalForm"]
    .forEach(id => document.getElementById(id).classList.add("hidden"));
  document.getElementById("result").innerHTML = "";
  if(chart){ chart.destroy(); chart = null; }
  const type = document.getElementById("configurationType").value;
  if(type) document.getElementById(type+"Form").classList.remove("hidden");
}
function adjustResistance(val, unit) {
  return unit==="kΩ" ? val*1000 : unit==="MΩ" ? val*1000000 : val;
}
// --- Modos ya existentes ---
function calculatePolarizacionFija() {
  const VGG = parseFloat(document.getElementById("VGG").value),
        IDSS = parseFloat(document.getElementById("IDSSFija").value),
        Vp = parseFloat(document.getElementById("VpFija").value),
        unitIDSS = document.getElementById("unitIDSSFija").value;
  if(isNaN(VGG) || VGG <= 0){ document.getElementById("result").innerHTML = "VGG debe ser positivo."; return; }
  if(isNaN(IDSS) || IDSS <= 0){ document.getElementById("result").innerHTML = "IDSS debe ser positivo."; return; }
  if(isNaN(Vp) || Vp >= 0){ document.getElementById("result").innerHTML = "Vp debe ser negativo."; return; }
  const VGSQ = -VGG,
        IDSSAmp = unitIDSS==="mA" ? IDSS/1000 : IDSS/1000000,
        IDQ = IDSSAmp * Math.pow(1 - VGSQ/Vp, 2),
        IDQDisplay = unitIDSS==="mA" ? IDQ*1000 : IDQ*1000000;
  document.getElementById("result").innerHTML = `<div class="result-box">VGSQ: ${VGSQ.toFixed(2)} V<br>IDQ: ${IDQDisplay.toFixed(2)} ${unitIDSS}</div>`;
  createOrUpdateChart("polarizacionFija", IDSS, Vp, unitIDSS, null, null, VGSQ);
}
function calculateIntersection() {
  const IDSS = parseFloat(document.getElementById("IDSS").value),
        unitIDSS = document.getElementById("unitIDSS").value,
        Vp = parseFloat(document.getElementById("Vp").value),
        Rs = parseFloat(document.getElementById("Rs").value),
        unitRs = document.getElementById("unitRs").value;
  if(isNaN(IDSS) || IDSS < 0){ document.getElementById("result").innerHTML = "IDSS debe ser positivo."; return; }
  if(isNaN(Vp) || Vp > 0){ document.getElementById("result").innerHTML = "Vp debe ser negativo."; return; }
  if(isNaN(Rs) || Rs < 0){ document.getElementById("result").innerHTML = "Rs debe ser positivo."; return; }
  let RsAdjusted = adjustResistance(Rs, unitRs),
      y = unitIDSS==="mA" ? 1e-3 : 1e-6,
      x = -y * RsAdjusted,
      m = 1 / x,
      a = IDSS / Math.pow(Vp, 2),
      b = -((2*IDSS)/Vp + m),
      c = IDSS,
      disc = Math.pow(b, 2) - 4*a*c;
  if(disc < 0){ document.getElementById("result").textContent = "No hay solución real."; return; }
  const sol1 = (-b + Math.sqrt(disc))/(2*a),
        sol2 = (-b - Math.sqrt(disc))/(2*a);
  let res = "", VGSQ;
  if(sol1 > Vp){ let IDQ1 = m * sol1; res += `<div class="result-box">VGSQ: ${sol1.toFixed(2)} V<br>IDQ: ${IDQ1.toFixed(2)} ${unitIDSS}</div>`; VGSQ = sol1; }
  if(sol2 > Vp){ let IDQ2 = m * sol2; res += `<div class="result-box">VGSQ: ${sol2.toFixed(2)} V<br>IDQ: ${IDQ2.toFixed(2)} ${unitIDSS}</div>`; if(!VGSQ) VGSQ = sol2; }
  if(!res){ res = "No hay soluciones donde VGSQ > Vp."; VGSQ = null; }
  document.getElementById("result").innerHTML = res;
  createOrUpdateChart("autopolarizacion1", IDSS, Vp, unitIDSS, RsAdjusted, null, VGSQ);
}
function calculateDivisorVoltaje() {
  const VDD = parseFloat(document.getElementById("VDD").value),
        R1 = parseFloat(document.getElementById("R1").value),
        R2 = parseFloat(document.getElementById("R2").value),
        Rs = parseFloat(document.getElementById("RsDivisor").value),
        IDSS = parseFloat(document.getElementById("IDSSDivisor").value),
        Vp = parseFloat(document.getElementById("VpDivisor").value),
        unitR1 = document.getElementById("unitR1").value,
        unitR2 = document.getElementById("unitR2").value,
        unitRs = document.getElementById("unitRsDivisor").value,
        unitIDSS = document.getElementById("unitIDSSDivisor").value;
  if(R1<=0 || isNaN(R1) || R2<=0 || isNaN(R2) || Rs<=0 || isNaN(Rs)){
    document.getElementById("result").innerHTML = "R1, R2 y Rs deben ser positivos."; return;
  }
  if(IDSS<=0 || isNaN(IDSS)){
    document.getElementById("result").innerHTML = "IDSS debe ser positivo."; return;
  }
  if(Vp>=0 || isNaN(Vp)){
    document.getElementById("result").innerHTML = "Vp debe ser negativo."; return;
  }
  const R1A = adjustResistance(R1, unitR1),
        R2A = adjustResistance(R2, unitR2),
        RsA = adjustResistance(Rs, unitRs),
        VG = (R2A * VDD) / (R1A + R2A),
        IDSSAmp = unitIDSS==="mA" ? IDSS/1000 : IDSS/1000000;
  function f(VGS) { return VGS - (VG - IDSSAmp * Math.pow(1 - VGS/Vp, 2) * RsA); }
  let VGSQ = VG, maxIt = 1000, tol = 1e-6, it = 0;
  while(it < maxIt){
    let f0 = f(VGSQ), df = (f(VGSQ+1e-6)-f0)/1e-6;
    let delta = f0/df; VGSQ -= delta;
    if(Math.abs(delta) < tol) break; it++;
  }
  const IDQ = IDSSAmp * Math.pow(1 - VGSQ/Vp, 2),
        IDQDisplay = unitIDSS==="mA" ? IDQ*1000 : IDQ*1000000;
  document.getElementById("result").innerHTML = `<div class="result-box">VGSQ: ${VGSQ.toFixed(2)} V<br>IDQ: ${IDQDisplay.toFixed(2)} ${unitIDSS}</div>`;
  createOrUpdateChart("divisorVoltaje1", IDSS, Vp, unitIDSS, RsA, VG, VGSQ);
}
function calculateAutopolarizacionMOSIncremental() {
  const VDD = parseFloat(document.getElementById("VDD_MOS").value),
        IDON = parseFloat(document.getElementById("IDON").value),
        VGS_ON = parseFloat(document.getElementById("VGS_ON").value),
        VGS_TH = parseFloat(document.getElementById("VGS_TH").value),
        RD = parseFloat(document.getElementById("RD").value),
        unitIDON = document.getElementById("unitIDON").value;
  if(isNaN(VDD) || VDD <= 0){ document.getElementById("result").innerHTML = "VDD debe ser positivo."; return; }
  if(isNaN(IDON) || IDON <= 0){ document.getElementById("result").innerHTML = "ID(ON) debe ser positivo."; return; }
  if(isNaN(VGS_ON) || VGS_ON <= 0){ document.getElementById("result").innerHTML = "VGS(ON) debe ser positivo."; return; }
  if(isNaN(VGS_TH) || VGS_TH <= 0){ document.getElementById("result").innerHTML = "VGS(TH) debe ser positivo."; return; }
  if(VGS_ON <= VGS_TH){ document.getElementById("result").innerHTML = "VGS(ON) debe ser mayor que VGS(TH)."; return; }
  if(isNaN(RD) || RD <= 0){ document.getElementById("result").innerHTML = "RD debe ser positivo."; return; }
  let RDAdjusted = adjustResistance(RD, document.getElementById("unitRD").value);
  const IDONAmp = unitIDON==="mA" ? IDON/1000 : IDON/1000000;
  const K = IDONAmp / Math.pow(VGS_ON - VGS_TH, 2);
  function f(ID) { return ID - K * Math.pow(VDD - RDAdjusted*ID - VGS_TH, 2); }
  function df(ID) { return 1 + 2*K*RDAdjusted*(VDD - RDAdjusted*ID - VGS_TH); }
  let ID = (VDD - VGS_TH)/(2*RDAdjusted), maxIt = 1000, tol = 1e-6, it = 0;
  while(it < maxIt){
    let delta = f(ID)/df(ID);
    ID -= delta;
    if(Math.abs(delta) < tol) break; it++;
  }
  const VGSQ = VDD - RDAdjusted*ID;
  if(VGSQ <= VGS_TH){ document.getElementById("result").innerHTML = "La solución encontrada no cumple: VGS > VGS(TH)."; return; }
  const IDQDisplay = unitIDON==="mA" ? ID*1000 : ID*1000000;
  document.getElementById("result").innerHTML = `<div class="result-box">VGSQ: ${VGSQ.toFixed(2)} V<br>IDQ: ${IDQDisplay.toFixed(2)} ${unitIDON}</div>`;
  createOrUpdateChart("autopolarizacionMOSIncremental", K, RDAdjusted, unitIDON, VDD, VGS_TH, VGSQ, ID);
}
// --- Nuevo modo: Divisor de voltaje (MOSFET incremental) ---
function calculateDivisorVoltajeMOSIncremental() {
  const VDD = parseFloat(document.getElementById("VDD_MOSDIV").value),
        R1 = parseFloat(document.getElementById("R1_MOSDIV").value),
        R2 = parseFloat(document.getElementById("R2_MOSDIV").value),
        RS = parseFloat(document.getElementById("RS_MOSDIV").value),
        IDON = parseFloat(document.getElementById("IDON_MOSDIV").value),
        VGS_ON = parseFloat(document.getElementById("VGS_ON_MOSDIV").value),
        VGS_TH = parseFloat(document.getElementById("VGS_TH_MOSDIV").value),
        unitIDON = document.getElementById("unitIDON_MOSDIV").value,
        unitR1 = document.getElementById("unitR1_MOSDIV").value,
        unitR2 = document.getElementById("unitR2_MOSDIV").value,
        unitRS = document.getElementById("unitRS_MOSDIV").value;
  if(isNaN(VDD) || VDD <= 0){ document.getElementById("result").innerHTML = "VDD debe ser positivo."; return; }
  if(isNaN(R1) || R1 <= 0 || isNaN(R2) || R2 <= 0 || isNaN(RS) || RS <= 0){
    document.getElementById("result").innerHTML = "R1, R2 y RS deben ser positivos."; return;
  }
  if(isNaN(IDON) || IDON <= 0){ document.getElementById("result").innerHTML = "ID(ON) debe ser positivo."; return; }
  if(isNaN(VGS_ON) || VGS_ON <= 0 || isNaN(VGS_TH) || VGS_TH <= 0){
    document.getElementById("result").innerHTML = "VGS(ON) y VGS(TH) deben ser positivos."; return;
  }
  if(VGS_ON <= VGS_TH){ document.getElementById("result").innerHTML = "VGS(ON) debe ser mayor que VGS(TH)."; return; }
  let R1A = adjustResistance(R1, unitR1),
      R2A = adjustResistance(R2, unitR2),
      RSA = adjustResistance(RS, unitRS);
  const VG = VDD * R2A / (R1A + R2A);
  const IDONAmp = unitIDON==="mA" ? IDON/1000 : IDON/1000000;
  const K = IDONAmp / Math.pow(VGS_ON - VGS_TH, 2);
  function f(I) { return I - K * Math.pow(VG - RSA*I - VGS_TH, 2); }
  function df(I) { return 1 + 2*K*RSA*(VG - RSA*I - VGS_TH); }
  let I = (VG - VGS_TH)/(2*RSA), maxIt = 1000, tol = 1e-6, it = 0;
  while(it < maxIt){
    let delta = f(I)/df(I);
    I -= delta;
    if(Math.abs(delta) < tol) break; it++;
  }
  const VGSQ = VG - RSA*I;
  if(VGSQ <= VGS_TH){ document.getElementById("result").innerHTML = "La solución encontrada no cumple: VGS > VGS(TH)."; return; }
  const IDQDisplay = unitIDON==="mA" ? I*1000 : I*1000000;
  document.getElementById("result").innerHTML = `<div class="result-box">VGSQ: ${VGSQ.toFixed(2)} V<br>IDQ: ${IDQDisplay.toFixed(2)} ${unitIDON}</div>`;
  createOrUpdateChart("divisorVoltajeMOSIncremental", K, RSA, unitIDON, VG, VGS_TH, VGSQ, I);
}
// --- Función de graficación ---
function createOrUpdateChart(cfg, p1, p2, p3, p4, p5, p6, p7) {
  // Modo: Autopolarización (MOSFET incremental)
  if(cfg==="autopolarizacionMOSIncremental") {
    // p1 = K, p2 = RD, p3 = unitIDON, p4 = VDD, p5 = VGS_TH, p6 = VGSQ, p7 = ID (en A)
    const K = p1, RD_val = p2, unit = p3, VDD = p4, VGS_TH = p5, VGSQ = p6, IDQ = p7,
          ctx = document.getElementById("fetChart").getContext("2d"),
          yLabel = unit==="mA" ? "ID (mA)" : "ID (µA)",
          convFactor = unit==="mA" ? 1000 : 1000000,
          vgsMin = VGS_TH, vgsMax = VDD,
          vgsValues = Array.from({length:201}, (_,i)=> vgsMin + (vgsMax-vgsMin)*(i/200)),
          idValues = vgsValues.map(vgs => vgs < VGS_TH ? 0 : K*Math.pow(vgs-VGS_TH,2)*convFactor),
          loadLineData = [{x: VDD, y: 0}, {x: VGS_TH, y: (VDD-VGS_TH)/(RD_val)*convFactor}],
          Qpoint = {x: VGSQ, y: IDQ*convFactor},
          yMax = Math.max(...idValues, loadLineData[1].y, Qpoint.y);
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          { label: "Punto Q", data: [Qpoint], backgroundColor: "green", pointRadius: 7 },
          { label: "Curva de transferencia", data: vgsValues.map((v,i)=>({x: v, y: idValues[i]})), borderColor: "blue", backgroundColor: "rgba(0,0,255,0.1)", showLine: true, pointRadius: 0 },
          { label: "Recta de carga", data: loadLineData, borderColor: "orange", backgroundColor: "rgba(255,165,0,0.1)", showLine: true, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { type: "linear", position: "bottom", title: {display: true, text: "VGS (V)"}, min: vgsMin, max: vgsMax, ticks: {callback: v=>v.toFixed(1)}, grid: { drawBorder: true, color: ctx=> ctx.tick.value===0 ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)" } },
          y: { type: "linear", position: "left", title: {display: true, text: yLabel}, min: 0, max: yMax, ticks: {callback: v=>v.toFixed(1)}, grid: { color: ctx=> ctx.tick.value===0 ? "black" : "rgba(0,0,0,0.1)" } }
        },
        plugins: {
          tooltip: { callbacks: { label: ctx=> { let lab = ctx.dataset.label ? ctx.dataset.label+": " : ""; return lab+`(${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`; } } },
          legend: { labels: { usePointStyle: true, pointStyle: "circle" } }
        }
      }
    });
    return;
  }
  // Modo: Divisor de voltaje (MOSFET incremental)
  if(cfg==="divisorVoltajeMOSIncremental") {
    // p1 = K, p2 = RS, p3 = unitIDON, p4 = VG, p5 = VGS_TH, p6 = VGSQ, p7 = ID (en A)
    const K = p1, RS_val = p2, unit = p3, VG = p4, VGS_TH = p5, VGSQ = p6, IDQ = p7,
          ctx = document.getElementById("fetChart").getContext("2d"),
          yLabel = unit==="mA" ? "ID (mA)" : "ID (µA)",
          convFactor = unit==="mA" ? 1000 : 1000000,
          vgsMin = VGS_TH, vgsMax = VG,
          vgsValues = Array.from({length:201}, (_,i)=> vgsMin + (vgsMax-vgsMin)*(i/200)),
          idValues = vgsValues.map(vgs => vgs < VGS_TH ? 0 : K*Math.pow(vgs-VGS_TH,2)*convFactor),
          loadLineData = [{x: VG, y: 0}, {x: VGS_TH, y: (VG-VGS_TH)/RS_val*convFactor}],
          Qpoint = {x: VGSQ, y: IDQ*convFactor},
          yMax = Math.max(...idValues, loadLineData[1].y, Qpoint.y);
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          { label: "Punto Q", data: [Qpoint], backgroundColor: "green", pointRadius: 7 },
          { label: "Curva de transferencia", data: vgsValues.map((v,i)=>({x: v, y: idValues[i]})), borderColor: "blue", backgroundColor: "rgba(0,0,255,0.1)", showLine: true, pointRadius: 0 },
          { label: "Recta de carga", data: loadLineData, borderColor: "orange", backgroundColor: "rgba(255,165,0,0.1)", showLine: true, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { type: "linear", position: "bottom", title: {display: true, text: "VGS (V)"}, min: vgsMin, max: vgsMax, ticks: {callback: v=>v.toFixed(1)}, grid: { drawBorder: true, color: ctx=> ctx.tick.value===0 ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)" } },
          y: { type: "linear", position: "left", title: {display: true, text: yLabel}, min: 0, max: yMax, ticks: {callback: v=>v.toFixed(1)}, grid: { color: ctx=> ctx.tick.value===0 ? "black" : "rgba(0,0,0,0.1)" } }
        },
        plugins: {
          tooltip: { callbacks: { label: ctx=> { let lab = ctx.dataset.label ? ctx.dataset.label+": " : ""; return lab+`(${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`; } } },
          legend: { labels: { usePointStyle: true, pointStyle: "circle" } }
        }
      }
    });
    return;
  }
  // Resto de modos (se mantiene lo previo)...
  const ctx = document.getElementById("fetChart").getContext("2d"),
        unitIDSS = p3!==null ? p3 : "mA",
        yLabel = unitIDSS==="mA" ? "ID (mA)" : "ID (µA)",
        yMult = unitIDSS==="mA" ? 1 : 1000;
  let vgsMin, vgsMax;
  if (cfg === "polarizacionFija") {
// p1 = IDSS, p2 = Vp, p3 = unidad (mA/µA), p6 = VGSQ
const IDSS = p1, Vp = p2, unit = p3, VGSQ = p6;
const ctx = document.getElementById("fetChart").getContext("2d");
const yLabel = unit === "mA" ? "ID (mA)" : "ID (µA)";
const convFactor = unit === "mA" ? 1000 : 1000000;
const IDSS_A = unit === "mA" ? IDSS / 1000 : IDSS / 1000000; // Convertir IDSS a Amperios

// Rango VGS (desde Vp hasta 0V)
const vgsMin = Math.min(Vp, VGSQ !== null ? VGSQ : Vp);
const vgsMax = 0;

// Curva de Shockley (ID en unidad deseada)
const vgsValues = Array.from({length: 201}, (_,i) => vgsMin + (vgsMax - vgsMin) * (i/200));
const idValues = vgsValues.map(vgs => 
    vgs <= Vp ? 0 : IDSS_A * Math.pow(1 - vgs/Vp, 2) * convFactor
);

// Recta de carga (línea vertical en VGSQ)
const maxY = IDSS_A * convFactor; // IDSS en la unidad del usuario
const loadLineData = [
    {x: VGSQ, y: 0},
    {x: VGSQ, y: maxY}
];

// Punto Q (intersección de VGSQ con la curva)
const IDQ = VGSQ <= Vp ? 0 : IDSS_A * Math.pow(1 - VGSQ/Vp, 2) * convFactor;
const yMax = Math.max(...idValues, maxY, IDQ);

if(chart) chart.destroy();
chart = new Chart(ctx, {
    type: "scatter",
    data: {
        datasets: [
            { 
                label: "Punto Q", 
                data: [{x: VGSQ, y: IDQ}], 
                backgroundColor: "green", 
                pointRadius: 7 
            },
            { 
                label: "Curva de transferencia", 
                data: vgsValues.map((v,i) => ({x: v, y: idValues[i]})), 
                borderColor: "blue", 
                showLine: true,
                pointRadius: 0
            },
            { 
                label: "Línea de polarización", 
                data: loadLineData, 
                borderColor: "orange", 
                showLine: true,
                pointRadius: 0
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: "linear",
                position: "bottom",
                title: { display: true, text: "VGS (V)" },
                min: vgsMin,
                max: vgsMax,
                ticks: { callback: v => v.toFixed(1) },
                grid: { 
                    drawBorder: true,
                    color: ctx => ctx.tick.value === 0 ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)"
                }
            },
            y: {
                type: "linear",
                position: "left",
                title: { display: true, text: yLabel },
                min: 0,
                max: yMax,
                ticks: { callback: v => v.toFixed(1) },
                grid: { 
                    color: ctx => ctx.tick.value === 0 ? "black" : "rgba(0,0,0,0.1)"
                }
            }
        },
        plugins: {
            tooltip: { 
                callbacks: { 
                    label: ctx => `${ctx.dataset.label}: (${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`
                } 
            },
            legend: { 
                labels: { 
                    usePointStyle: true, 
                    pointStyle: "circle" 
                } 
            }
        }
    }
});
}
   else if (cfg === "autopolarizacion1") {
    const IDSS = p1, Vp = p2, Rs = p4, unitIDSS = p3, VGSQ = p6;
    const ctx = document.getElementById("fetChart").getContext("2d");
    const yLabel = unitIDSS === "mA" ? "ID (mA)" : "ID (µA)";
    const convFactor = unitIDSS === "mA" ? 1000 : 1000000;
    const IDSS_A = unitIDSS === "mA" ? IDSS / 1000 : IDSS / 1000000;

    // Rango VGS
    const vgsMin = Math.min(Vp, VGSQ !== null ? VGSQ : Vp);
    const vgsMax = 0;

    // Curva de Shockley
    const vgsValues = Array.from({length: 201}, (_,i) => vgsMin + (vgsMax - vgsMin) * (i/200));
    const idValues = vgsValues.map(vgs => 
        vgs <= Vp ? 0 : IDSS_A * Math.pow(1 - vgs/Vp, 2) * convFactor
    );

    // Recta de carga: VGS = -ID * Rs
    const maxID = (-Vp / Rs) * convFactor;
    const loadLineData = [
        {x: 0, y: 0},
        {x: Vp, y: maxID}
    ];

    // Punto Q
    const IDQ = VGSQ ? IDSS_A * Math.pow(1 - VGSQ/Vp, 2) * convFactor : 0;
    const yMax = Math.max(...idValues, maxID, IDQ);
    
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                { 
                    label: "Punto Q", 
                    data: [{x: VGSQ, y: IDQ}], 
                    backgroundColor: "green", 
                    pointRadius: 7 
                },
                { 
                    label: "Curva de transferencia", 
                    data: vgsValues.map((v,i) => ({x: v, y: idValues[i]})), 
                    borderColor: "blue", 
                    showLine: true,
                    pointRadius: 0
                },
                { 
                    label: "Recta de carga", 
                    data: loadLineData, 
                    borderColor: "orange", 
                    showLine: true,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: { display: true, text: "VGS (V)" },
                    min: vgsMin,
                    max: vgsMax,
                    ticks: { callback: v => v.toFixed(1) },
                    grid: { 
                        drawBorder: true,
                        color: ctx => ctx.tick.value === 0 ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)"
                    }
                },
                y: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: yLabel },
                    min: 0,
                    max: yMax,
                    ticks: { callback: v => v.toFixed(1) },
                    grid: { 
                        color: ctx => ctx.tick.value === 0 ? "black" : "rgba(0,0,0,0.1)"
                    }
                }
            },
            plugins: {
                tooltip: { 
                    callbacks: { 
                        label: ctx => `${ctx.dataset.label}: (${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`
                    } 
                },
                legend: { 
                    labels: { 
                        usePointStyle: true, 
                        pointStyle: "circle" 
                    } 
                }
            }
        }
    });
}

// Modo: Divisor de voltaje (JFET)
else if (cfg === "divisorVoltaje1") {
    const IDSS = p1, Vp = p2, Rs = p4, VG = p5, unitIDSS = p3, VGSQ = p6;
    const ctx = document.getElementById("fetChart").getContext("2d");
    const yLabel = unitIDSS === "mA" ? "ID (mA)" : "ID (µA)";
    const convFactor = unitIDSS === "mA" ? 1000 : 1000000;
    const IDSS_A = unitIDSS === "mA" ? IDSS / 1000 : IDSS / 1000000;

    // Rango VGS
    const vgsMin = Math.min(Vp, VGSQ !== null ? VGSQ : Vp);
    const vgsMax = Math.max(VG, VGSQ !== null ? VGSQ : VG);

    // Curva de Shockley
    const vgsValues = Array.from({length: 201}, (_,i) => vgsMin + (vgsMax - vgsMin) * (i/200));
    const idValues = vgsValues.map(vgs => 
        vgs <= Vp ? 0 : IDSS_A * Math.pow(1 - vgs/Vp, 2) * convFactor
    );

    // Recta de carga: VGS = VG - ID * Rs
    const maxID = ((VG - Vp) / Rs) * convFactor;
    const loadLineData = [
        {x: VG, y: 0},
        {x: Vp, y: maxID}
    ];

    // Punto Q
    const IDQ = VGSQ ? IDSS_A * Math.pow(1 - VGSQ/Vp, 2) * convFactor : 0;
    const yMax = Math.max(...idValues, maxID, IDQ);
    
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [
                { 
                    label: "Punto Q", 
                    data: [{x: VGSQ, y: IDQ}], 
                    backgroundColor: "green", 
                    pointRadius: 7 
                },
                { 
                    label: "Curva de transferencia", 
                    data: vgsValues.map((v,i) => ({x: v, y: idValues[i]})), 
                    borderColor: "blue", 
                    showLine: true,
                    pointRadius: 0
                },
                { 
                    label: "Recta de carga", 
                    data: loadLineData, 
                    borderColor: "orange", 
                    showLine: true,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: { display: true, text: "VGS (V)" },
                    min: vgsMin,
                    max: vgsMax,
                    ticks: { callback: v => v.toFixed(1) },
                    grid: { 
                        drawBorder: true,
                        color: ctx => ctx.tick.value === 0 ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.1)"
                    }
                },
                y: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: yLabel },
                    min: 0,
                    max: yMax,
                    ticks: { callback: v => v.toFixed(1) },
                    grid: { 
                        color: ctx => ctx.tick.value === 0 ? "black" : "rgba(0,0,0,0.1)"
                    }
                }
            },
            plugins: {
                tooltip: { 
                    callbacks: { 
                        label: ctx => `${ctx.dataset.label}: (${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`
                    } 
                },
                legend: { 
                    labels: { 
                        usePointStyle: true, 
                        pointStyle: "circle" 
                    } 
                }
            }
        }
    });
} 
}