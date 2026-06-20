(function(){
"use strict";
// Logic + rendering. Reads the global `plants` defined in plant-data.js (loaded first).
const months = [3,4,5,6,7,8,9,10,11];
const monthName = {3:"Mar",4:"Apr",5:"May",6:"Jun",7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov"};
let runCount = 0;
const goalOrder = ["bees","butterflies","monarchs","hummingbirds","cardinals","biodiversity"];
const goalNames = {bees:"Bees", butterflies:"Butterflies", monarchs:"Monarchs", hummingbirds:"Hummingbirds", cardinals:"Cardinals / songbirds", biodiversity:"Maximum biodiversity"};

function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function selectedGoals(){
  const checked = Array.from(document.querySelectorAll(".goalCheck:checked")).map(x=>x.value).filter(g=>goalOrder.includes(g));
  return checked.length ? checked : ["biodiversity"];
}

function clampNumber(value, fallback, min, max){
  const n = Number(value);
  const clean = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, clean));
}

function readInputs(){
  const goals = selectedGoals();
  const squirrelMode = $("squirrelMode").value;
  const snakeMode = $("snakeMode") ? $("snakeMode").value : "ignore";
  const bearMode = $("bearMode") ? $("bearMode").value : "ignore";
  const zip = $("zip").value;
  return {
    zip,
    locations: regionFromZip(zip).locations,
    length:clampNumber($("length").value, 14, 3, 100),
    depth:clampNumber($("depth").value, 6, 2, 50),
    sun:$("sun").value,
    moisture:$("moisture").value,
    soil:$("soil").value,
    condition:$("condition").value,
    layoutType:$("layoutType") ? $("layoutType").value : "flowerBed",
    bedShape:$("bedShape") ? $("bedShape").value : "oval",
    mulchDepth:$("mulchDepth") ? clampNumber($("mulchDepth").value, 3, 1, 6) : 3,
    goals,
    goal:goals[0],
    squirrelMode,
    snakeMode,
    bearMode,
    snakeAware: snakeMode !== "ignore",
    snakePlantCandidates: snakeMode === "spikyAromatic",
    style:$("style").value,
    designMode:$("designMode").value,
    nativeOnly:$("nativeOnly").checked,
    petSafe:$("petSafe").checked,
    deer:$("deer").checked,
    hoa:$("hoa").checked,
    squirrelAware:squirrelMode === "factor",
    mosquitoAware:$("mosquitoAware").checked
  };
}

function hasGoal(inputs, goal){
  return (inputs.goals && inputs.goals.length ? inputs.goals : [inputs.goal || "biodiversity"]).includes(goal);
}

function goalScore(p, inputs){
  const goals = inputs.goals && inputs.goals.length ? inputs.goals : [inputs.goal || "biodiversity"];
  return Math.max(...goals.map(g => p.roles[g] || 0));
}

function designModeSettings(mode){
  return {
    beginner:{label:"Beginner",speciesOffset:-3,qtyFactor:.78,description:"Compact, legible, lower-risk plantings; avoids vigorous spreaders, toxicity-review plants, and large vines/shrubs when possible."},
    standard:{label:"Standard",speciesOffset:0,qtyFactor:1,description:"Balanced habitat value and front-yard manageability; keeps the balanced behavior with installation guidance."},
    advanced:{label:"Advanced",speciesOffset:3,qtyFactor:1.18,description:"More species, more layered habitat, more host/nectar redundancy, and explicit management warnings for vigorous plants."}
  }[mode] || {label:"Standard",speciesOffset:0,qtyFactor:1,description:"Balanced habitat value and front-yard manageability."};
}

function targetSpeciesCount(area, inputs){
  const base = area < 55 ? 8 : area < 100 ? 11 : 14;
  const settings = designModeSettings(inputs.designMode);
  const cap = inputs.designMode === "beginner" ? 10 : inputs.designMode === "advanced" ? 18 : 14;
  const floor = inputs.designMode === "beginner" ? 6 : inputs.designMode === "advanced" ? 10 : 8;
  return Math.max(floor, Math.min(cap, base + settings.speciesOffset));
}

function regionFromZip(zip){
  const z = String(zip).replace(/\D/g, "").slice(0,5);
  if(z === "77429") return {name:"Houston / Cypress, TX",shortName:"Houston / Gulf Coast",status:"target",locations:["77429"],note:"ZIP 77429 — Houston area (Cypress, TX); Gulf Coast native plant palette."};
  return {name:"Colorado Springs / Cheyenne Mtn, CO",shortName:"Colorado Springs / Front Range",status:"target",locations:["80906"],note:"ZIP 80906 — Colorado Springs (Cheyenne Mountain area); Front Range native plant palette."};
}

function conditionMatches(p, inputs, strict){
  const c = inputs.condition;
  if(c === "standard") return true;
  if(c === "rainGarden") return p.moist.includes("wet") || p.conditions.includes("rainGarden");
  if(c === "floodEdge") return p.moist.includes("wet") || p.conditions.includes("rainGarden") || p.conditions.includes("heavyClay");
  if(c === "coastalExposure") return p.conditions.includes("coastalExposure") || p.soil.includes("sandy");
  if(c === "heavyClay" || c === "gumboClay") return p.soil.includes("clay") || p.conditions.includes("heavyClay");
  if(c === "urbanHeat" || c === "streetHellstrip") return p.conditions.includes("urbanHeat") || p.tags.includes("heat humidity") || p.moist.includes("dry") || p.soil.includes("sandy");
  if(c === "patioContainer") return (p.spread[1] <= 48 && p.height[1] <= 72 && !p.aggressive) || p.layer === "front";
  if(c === "postFreeze") return p.native && (p.layer !== "back" || p.tags.includes("shrub") || p.tags.includes("vine") || p.tags.includes("grass") || p.tags.includes("evergreen cover"));
  if(c === "hoaFront") return p.tidy && !p.aggressive && p.height[1] <= 96;
  if(c === "xeric") return p.conditions.includes("xeric") || p.conditions.includes("highDesert") || p.moist.includes("dry");
  if(c === "rockGarden") return p.conditions.includes("rockGarden") || p.soil.includes("sandy") || p.moist.includes("dry");
  if(c === "highDesert") return p.conditions.includes("highDesert") || p.conditions.includes("xeric") || p.moist.includes("dry");
  if(c === "shadedSite") return p.conditions.includes("shadedSite") || p.sun.includes("part") || p.sun.includes("shade");
  return !strict;
}

function conditionBonus(p, inputs){
  const c = inputs.condition;
  if(c === "standard") return 0;
  if(!conditionMatches(p, inputs, false)) return -1;
  if(c === "patioContainer") return p.layer === "front" ? 3 : 2;
  if(c === "hoaFront") return p.tidy && !p.aggressive ? 3 : -2;
  if(c === "streetHellstrip") return (p.conditions.includes("urbanHeat") || p.moist.includes("dry")) ? 4 : 1;
  if(c === "floodEdge" || c === "rainGarden") return (p.moist.includes("wet") || p.tags.includes("wet soil")) ? 4 : 1;
  if(c === "gumboClay" || c === "heavyClay") return p.soil.includes("clay") ? 3 : 1;
  if(c === "postFreeze") return p.tags.includes("grass") || p.tags.includes("overwintering habitat") ? 3 : 1;
  if(c === "coastalExposure") return p.conditions.includes("coastalExposure") ? 4 : 1;
  if(c === "xeric") return p.moist.includes("dry") ? 3 : 1;
  if(c === "rockGarden") return (p.conditions.includes("rockGarden") || p.soil.includes("sandy")) ? 3 : 1;
  if(c === "highDesert") return (p.conditions.includes("highDesert") || p.conditions.includes("xeric")) ? 3 : 1;
  if(c === "shadedSite") return (p.sun.includes("part") || p.sun.includes("shade")) ? 3 : 1;
  return 1;
}

function matches(p, inputs){
  if(inputs.locations && inputs.locations.length && p.location && p.location.length) {
    if(!p.location.some(loc => inputs.locations.includes(loc))) return false;
  }
  if(inputs.nativeOnly && !p.native) return false;
  if(!p.sun.includes(inputs.sun)) return false;
  if(!p.moist.includes(inputs.moisture)) return false;
  if(!conditionMatches(p, inputs, true)) return false;
  if(inputs.soil !== "unknown" && !p.soil.includes(inputs.soil) && !p.soil.includes("unknown")) return false;
  if(inputs.petSafe && p.pet) return false;
  if(inputs.deer && !p.deer) return false;
  if(inputs.squirrelAware && p.squirrel >= 4 && !hasGoal(inputs, "cardinals")) return false;
  if(inputs.snakeAware && p.tags.includes("groundcover")) return false;
  if(inputs.snakeAware && p.tags.includes("dense low cover")) return false;
  if(inputs.snakeAware && p.tags.includes("vine") && inputs.layoutType !== "fenceLine") return false;
  if(inputs.snakeAware && p.aggressive && (p.tags.includes("cover") || p.tags.includes("shade grass")) && !hasGoal(inputs, "cardinals")) return false;
  if(inputs.designMode === "beginner" && (p.aggressive || p.pet || p.height[1] > 96 || p.tags.includes("vine"))) return false;
  if(inputs.designMode === "beginner" && inputs.hoa && !p.tidy) return false;
  if(inputs.hoa && isFrontYardStyle(inputs.style) && !p.tidy && p.aggressive && inputs.designMode !== "advanced") return false;
  const area = inputs.length * inputs.depth;
  if(area < 70 && p.spread[1] > 60) return false;
  if(area < 55 && p.height[1] > 72) return false;
  return true;
}

function scorePlant(p, inputs){
  let score = goalScore(p, inputs) || p.roles.biodiversity || 0;
  if(isFrontYardStyle(inputs.style) && p.tidy) score += 2.5;
  if(inputs.style === "frontCurb" && p.height[1] <= 48 && !p.aggressive) score += 2;
  if(inputs.style === "frontFoundation" && (p.layer === "front" || p.layer === "middle") && p.tidy) score += 2;
  if(inputs.style === "frontEntry" && !["green","white"].includes(p.color) && p.height[1] <= 48) score += 2.5;
  if(inputs.style === "prairie" && (p.tags.includes("grass") || p.tags.includes("vertical structure") || p.tags.includes("keystone"))) score += 2;
  if(inputs.style === "meadow" && (p.tags.includes("grass") || p.tags.includes("seed heads") || p.tags.includes("late nectar") || p.tags.includes("fall bloom"))) score += 2.5;
  if(inputs.style === "colorful" && !["green","white"].includes(p.color)) score += 1.5;
  if(inputs.style === "patioView" && (p.tags.includes("hummingbirds") || p.tags.includes("aromatic edge") || p.layer === "front")) score += 2.5;
  if(inputs.style === "backyardHabitat" && (p.tags.includes("cover") || p.tags.includes("berries") || p.tags.includes("songbird food") || p.tags.includes("overwintering habitat"))) score += 3;
  if(inputs.style === "backyardBorder" && (p.layer === "back" || p.tags.includes("vertical structure") || p.tags.includes("shrub"))) score += 2;
  if(inputs.style === "wildlife" && (p.tags.includes("cover") || p.tags.includes("berries") || p.tags.includes("songbird food") || p.tags.includes("shrub"))) score += 3;
  if(hasGoal(inputs, "bees") && p.roles.bees >= 8) score += 5;
  if(hasGoal(inputs, "butterflies") && p.roles.butterflies >= 8) score += 5;
  if(hasGoal(inputs, "monarchs") && p.tags.includes("monarch host")) score += 7;
  if(hasGoal(inputs, "monarchs") && p.tags.includes("monarch nectar")) score += 4;
  if(hasGoal(inputs, "hummingbirds") && (p.tags.includes("hummingbirds") || p.color === "red")) score += 6;
  if(hasGoal(inputs, "cardinals") && (p.tags.includes("berries") || p.tags.includes("songbird food") || p.tags.includes("cover") || p.tags.includes("evergreen cover"))) score += 6;
  if(hasGoal(inputs, "biodiversity") && p.tags.includes("monarch host")) score += 3;
  if(hasGoal(inputs, "biodiversity") && p.tags.includes("hummingbirds")) score += 2;
  if(hasGoal(inputs, "biodiversity") && (p.tags.includes("late nectar") || p.tags.includes("fall bloom"))) score += 3;
  if(hasGoal(inputs, "biodiversity") && p.tags.includes("overwintering habitat")) score += 2;
  if(hasGoal(inputs, "biodiversity") && (p.tags.includes("seed heads") || p.tags.includes("berries") || p.tags.includes("cover"))) score += 2;
  if(inputs.mosquitoAware && (p.tags.includes("aromatic edge") || p.tags.includes("mint family"))) score += 5;
  if(inputs.snakeAware){
    if(p.tags.includes("open base") || p.tags.includes("spiky edge")) score += 5;
    if(p.tags.includes("snake-aware candidate")) score += 3;
    if(p.tags.includes("groundcover") || p.tags.includes("dense low cover")) score -= 8;
    if(p.tags.includes("vine") && inputs.layoutType !== "fenceLine") score -= 5;
    if(p.aggressive && (p.tags.includes("cover") || p.tags.includes("shade grass"))) score -= hasGoal(inputs, "cardinals") ? 2 : 6;
    if(inputs.snakePlantCandidates && (p.tags.includes("spiky edge") || p.tags.includes("aromatic edge"))) score += 4;
  }
  if(p.bear && inputs.bearMode === "reduce") score = Math.max(1, Math.round(score * 0.2));
  if(p.bear && inputs.bearMode === "attract") score += 8;
  if(p.tags.includes("vine")){
    if(inputs.layoutType === "fenceLine" || inputs.layoutType === "foundation") score += 3;
    else if(inputs.layoutType === "flowerBed") score -= 3;
    else score -= 4;
  }
  if((inputs.layoutType === "curbStrip" || inputs.layoutType === "patioCluster") && p.height[1] > 72) score -= 3;
  if(inputs.layoutType === "rainPocket" && (p.moist.includes("wet") || p.tags.includes("wet soil"))) score += 3;
  score += conditionBonus(p, inputs);
  if(inputs.hoa && p.aggressive) score -= 2.5;
  if(inputs.squirrelAware && p.squirrel >= 3 && !hasGoal(inputs, "cardinals")) score -= 4;
  if(inputs.designMode === "beginner"){
    if(p.tidy && p.height[1] <= 72 && !p.aggressive) score += 3;
    if(p.aggressive || p.pet || p.tags.includes("vine") || p.height[1] > 96) score -= 8;
  }
  if(inputs.designMode === "advanced"){
    if(p.tags.includes("monarch host") || p.tags.includes("late nectar") || p.tags.includes("overwintering habitat") || p.tags.includes("cover")) score += 2;
    if(p.aggressive) score += 1;
  }
  return score;
}

function generate(){
  const inputs = readInputs();
  runCount += 1;

  let candidates = plants.filter(p => matches(p, inputs));
  if(candidates.length < 6){
    candidates = plants.filter(p =>
      p.location.some(loc => inputs.locations.includes(loc)) &&
      (!inputs.nativeOnly || p.native) &&
      p.sun.includes(inputs.sun) &&
      p.moist.includes(inputs.moisture) &&
      (!inputs.petSafe || !p.pet) &&
      (!inputs.deer || p.deer)
    );
  }
  candidates = candidates.map(p => ({...p, score:scorePlant(p, inputs)}))
    .sort((a,b)=>b.score-a.score);

  if(!candidates.length){
    renderNoMatches(inputs, "No plant records matched the current site and constraint combination.");
    return;
  }

  let selected = [];
  function addWhere(fn, maxToAdd){
    // maxToAdd is per seeding pass, not a cumulative total. This keeps multi-goal selections from being dominated by whichever goal runs first.
    let added = 0;
    for(const p of candidates){
      if(added >= maxToAdd) break;
      if(!selected.find(x=>x.id===p.id) && fn(p)){
        selected.push(p);
        added += 1;
      }
    }
  }

  if(hasGoal(inputs, "bees")) addWhere(p => p.roles.bees >= 8 || p.tags.includes("bees") || p.tags.includes("pollen"), 4);
  if(hasGoal(inputs, "butterflies")) addWhere(p => p.roles.butterflies >= 8 || p.tags.includes("butterflies") || p.tags.includes("butterfly host"), 4);
  if(hasGoal(inputs, "monarchs")) {
    addWhere(p => p.tags.includes("monarch host"), 3);
    addWhere(p => p.tags.includes("monarch nectar") || p.tags.includes("late nectar"), 6);
  }
  if(hasGoal(inputs, "hummingbirds")) addWhere(p => p.tags.includes("hummingbirds") || p.color === "red", 6);
  if(hasGoal(inputs, "cardinals")) addWhere(p => p.tags.includes("berries") || p.tags.includes("songbird food") || p.tags.includes("cover") || p.tags.includes("evergreen cover"), 6);
  if(inputs.mosquitoAware) addWhere(p => p.tags.includes("aromatic edge") || p.tags.includes("mint family"), 6);
  if(inputs.snakeAware) addWhere(p => p.tags.includes("open base") || p.tags.includes("spiky edge") || p.tags.includes("snake-aware candidate"), 6);
  if(hasGoal(inputs, "biodiversity")) {
    addWhere(p => p.tags.includes("monarch host"), 2);
    addWhere(p => p.tags.includes("hummingbirds") || p.color === "red", 4);
    addWhere(p => p.tags.includes("late nectar") || p.tags.includes("fall bloom"), 6);
    addWhere(p => p.tags.includes("songbird seed") || p.tags.includes("berries") || p.tags.includes("cover") || p.tags.includes("seed heads"), 8);
  }
  addWhere(p => p.bloom.some(m=>m<=4), 7);
  addWhere(p => p.bloom.some(m=>m>=9), 10);
  addWhere(p => p.layer === "front", 11);
  addWhere(p => p.layer === "middle", 14);
  addWhere(p => p.layer === "back", 16);
  addWhere(p => true, 16);

  const area = inputs.length * inputs.depth;
  const target = targetSpeciesCount(area, inputs);
  selected = selected.slice(0, target);
  selected = improveSeasonalCoverage(selected, candidates, inputs, target).slice(0, target);

  if(!selected.length){
    renderNoMatches(inputs, "The app found candidates, but none survived the palette-building stage. Try loosening Native-only, pet/toxicity, deer, squirrel, snake, or site-condition constraints.");
    return;
  }

  const palette = selected.map(p => {
    const avgSpread = (p.spread[0]+p.spread[1])/2;
    // Estimate plant count from available area per species divided by a rough square-foot footprint; floor footprint at 2.4 sq ft so tiny spread values do not overfill the bed.
    let qty = Math.max(1, Math.round(((area / selected.length) / Math.max(2.4, (avgSpread/12)*(avgSpread/12))) * designModeSettings(inputs.designMode).qtyFactor));
    if(p.layer === "front") qty = Math.min(7, qty+1);
    if(p.layer === "back") qty = Math.max(1, Math.min(3, qty));
    if(p.tags.includes("vine") || p.tags.includes("shrub")) qty = Math.min(qty, area > 120 ? 2 : 1);
    if(area < 55) qty = Math.min(qty, 3);
    return {...p, qty};
  });

  const score = computeScore(palette, inputs);
  render(inputs, palette, score);
}

function seasonStats(palette){
  const seasonDefs = {
    spring:{label:"Spring",months:[3,4,5]},
    summer:{label:"Summer",months:[6,7,8]},
    fall:{label:"Fall",months:[9,10,11]}
  };
  const out = {};
  Object.entries(seasonDefs).forEach(([key,def]) => {
    const plantsForSeason = palette.filter(p=>p.bloom.some(m=>def.months.includes(m)));
    const monthsCovered = new Set();
    plantsForSeason.forEach(p=>p.bloom.filter(m=>def.months.includes(m)).forEach(m=>monthsCovered.add(m)));
    out[key] = {label:def.label, count:plantsForSeason.length, months:monthsCovered.size, plants:plantsForSeason.map(p=>p.common)};
  });
  out.balance = Math.round(((out.spring.months + out.summer.months + out.fall.months) / 9) * 100);
  out.minimumSeasonSpecies = Math.min(out.spring.count, out.summer.count, out.fall.count);
  return out;
}

function improveSeasonalCoverage(selected, candidates, inputs, target){
  const seasonTests = [
    ["spring", p=>p.bloom.some(m=>m>=3 && m<=5)],
    ["summer", p=>p.bloom.some(m=>m>=6 && m<=8)],
    ["fall", p=>p.bloom.some(m=>m>=9 && m<=11)]
  ];
  let out = selected.slice();
  for(const [name,test] of seasonTests){
    if(out.some(test)) continue;
    const add = candidates.find(p=>test(p) && !out.find(x=>x.id===p.id));
    if(add) out.push(add);
  }
  if(inputs.designMode === "advanced"){
    const redundancy = [
      p=>p.tags.includes("monarch host"),
      p=>p.tags.includes("late nectar") || p.tags.includes("fall bloom"),
      p=>p.tags.includes("hummingbirds"),
      p=>p.tags.includes("seed heads") || p.tags.includes("berries") || p.tags.includes("cover")
    ];
    for(const test of redundancy){
      const count = out.filter(test).length;
      if(count >= 2) continue;
      const add = candidates.find(p=>test(p) && !out.find(x=>x.id===p.id));
      if(add) out.push(add);
      if(out.length >= target) break;
    }
  }
  return out.sort((a,b)=>b.score-a.score);
}

function computeScore(palette, inputs){
  if(!palette.length){
    const seasonal = seasonStats([]);
    return {total:0, bloomContinuity:0, nativeDensity:0, hostSupport:0, pollinatorSupport:0, structureScore:0, siteFit:0, seasonal, seasonalBalance:0};
  }
  const hasMonths = new Set();
  palette.forEach(p=>p.bloom.forEach(m=>hasMonths.add(m)));
  const nativePct = palette.length ? palette.filter(p=>p.native).length / palette.length : 0;
  const host = palette.some(p=>p.tags.includes("monarch host"));
  const monarchNectar = palette.some(p=>p.tags.includes("monarch nectar") || p.tags.includes("late nectar"));
  const bee = palette.some(p=>p.roles.bees >= 8);
  const butterfly = palette.some(p=>p.roles.butterflies >= 8);
  const hum = palette.some(p=>p.roles.hummingbirds >= 8);
  const birds = palette.some(p=>p.roles.cardinals >= 6);
  const structure = palette.some(p=>p.tags.includes("structure") || p.tags.includes("overwintering habitat") || p.tags.includes("cover") || p.tags.includes("grass") || p.tags.includes("evergreen cover"));
  const gulfFit = palette.filter(p => conditionMatches(p, inputs, false)).length;
  const bloomContinuity = Math.round(Math.min(25, hasMonths.size / 9 * 25));
  const nativeDensity = Math.round(nativePct * 20);
  let hostSupport = hasGoal(inputs, "monarchs") ? (host ? 20 : 6) : (host ? 14 : 8);
  if(host && monarchNectar) hostSupport = Math.min(20, hostSupport + 3);
  const goalSupportParts = [];
  if(hasGoal(inputs, "bees")) goalSupportParts.push(bee ? 4 : 1);
  if(hasGoal(inputs, "butterflies")) goalSupportParts.push(butterfly ? 4 : 1);
  if(hasGoal(inputs, "monarchs")) goalSupportParts.push((host && monarchNectar) ? 4 : host ? 3 : 1);
  if(hasGoal(inputs, "hummingbirds")) goalSupportParts.push(hum ? 4 : 1);
  if(hasGoal(inputs, "cardinals")) goalSupportParts.push(birds ? 4 : 1);
  if(hasGoal(inputs, "biodiversity") || !goalSupportParts.length) goalSupportParts.push((bee?1:0) + (butterfly?1:0) + (hum?1:0) + (birds?1:0));
  let pollinatorSupport = Math.min(15, Math.round((goalSupportParts.reduce((a,b)=>a+b,0) / Math.max(1, goalSupportParts.length * 4)) * 15));
  const structureScore = structure ? 10 : 5;
  const siteFit = Math.min(10, Math.round((gulfFit / Math.max(1,palette.length)) * 10));
  const seasonal = seasonStats(palette);
  const seasonalBalance = Math.round(seasonal.balance / 10);
  const total = Math.min(100, bloomContinuity + nativeDensity + hostSupport + pollinatorSupport + structureScore + siteFit + Math.max(0, seasonalBalance - 6));
  return {total, bloomContinuity, nativeDensity, hostSupport, pollinatorSupport, structureScore, siteFit, seasonal, seasonalBalance};
}

function renderNoMatches(inputs, reason){
  const region = regionFromZip(inputs.zip);
  const html = `
    <div class="generation-notice no-print"><strong>No matching design generated.</strong> The current inputs are too restrictive for the prototype plant data set.</div>
    <p class="eyebrow">No matching plant palette</p>
    <h2>No plant palette matched these constraints</h2>
    <p>${esc(reason)} Region read: <strong>${esc(region.name)}</strong>. Bed size: ${esc(inputs.length)} × ${esc(inputs.depth)} ft. Goals: ${esc(goalListText(inputs))}.</p>
    <div class="info"><strong>How to resolve:</strong> try turning off Native-only temporarily, switch from Beginner to Standard, remove pet/toxicity-review or deer constraints, choose average moisture instead of a specialized micro-site, or select a less restrictive snake/squirrel option.</div>
    <div class="tabs no-print"><button type="button" class="tab active" onclick="PS.showTab('risks')">Warnings</button><button type="button" class="tab" onclick="PS.showTab('region')">Region notes</button><button type="button" class="tab" onclick="PS.showTab('test')">Test this app</button></div>
    <section id="tab-risks" class="tab-view active"><h3>Why no design appeared</h3><p>The hard filters eliminated the available starter plant records. This is preferable to showing a misleading score or a zero-plant design.</p><ul class="why-list"><li>Reduce one constraint at a time so the tester can see which filter is excluding the palette.</li><li>For production, this state should become less common as the plant database grows.</li></ul></section>
    <section id="tab-region" class="tab-view"><h3>Prototype data limit</h3><p>Pollinator Studio V4.0 uses region-specific starter plant sets (77429: Gulf Coast; 80906: Front Range). A production version should use a larger source-verified plant database.</p></section>
    <section id="tab-test" class="tab-view">${renderTesting(inputs)}</section>`;
  $('results').innerHTML = html;
  $('results').classList.remove('empty');
  $('results').scrollIntoView({behavior:'smooth', block:'start'});
}

function render(inputs, palette, score){
  const totalPlants = palette.reduce((s,p)=>s+p.qty,0);
  const region = regionFromZip(inputs.zip);
  const mode = designModeSettings(inputs.designMode);
  const title = `${mode.label} ${cap(inputs.style)} ${region.shortName || region.name} ${goalTitle(inputs)} ${layoutTitle(inputs.layoutType)}`;
  const warnings = [];
  palette.forEach(p => {
    if(p.pet) warnings.push(`${p.common} is flagged for toxicity review if pets or children browse plants.`);
    if(p.aggressive) warnings.push(`${p.common} can spread; use contained drifts, edging, or edit it out for a tidier design.`);
    if(inputs.squirrelAware && p.squirrel >= 3) warnings.push(`${p.common} may also attract squirrels because berries, fruit, or dense wildlife cover are shared resources.`);
    if(inputs.snakeAware && (p.tags.includes("groundcover") || p.tags.includes("dense low cover") || (p.aggressive && p.tags.includes("cover")))) warnings.push(`${p.common} may create low hiding cover unless it is thinned, edged, or kept out of high-traffic areas.`);
    if(inputs.snakeAware && p.tags.includes("spiky edge")) warnings.push(`${p.common} is a spiky-edge candidate; keep it away from narrow paths, pets, and children.`);
    if(p.bear && inputs.bearMode === "reduce") warnings.push(`${p.common} produces berries that attract black bears (per Colorado Parks and Wildlife); it is included because it matched site and bird-habitat criteria, but was down-ranked by Reduce bear attraction mode.`);
    if(p.bear && inputs.bearMode === "attract") warnings.push(`${p.common} is a berry-producing bear-food plant. Colorado Parks and Wildlife strongly discourages intentionally attracting bears to residential yards.`);
  });
  if(hasGoal(inputs, "cardinals")) warnings.push("Cardinals are birds, not pollinators. This goal optimizes for seed/berry value, cover, and layered structure.");
  if(inputs.squirrelAware) warnings.push("Squirrel-aware mode avoids intentional squirrel attractors, but bird-supporting seed heads and berries cannot fully exclude squirrels.");
  if(inputs.bearMode === "reduce" && (hasGoal(inputs, "cardinals") || hasGoal(inputs, "biodiversity")) && palette.some(p => p.bear)) warnings.push("Conflict: berry/cover plants that support birds (cardinals, biodiversity) are also bear-food sources. Bear attraction is minimized but these plants may still appear because no Colorado-appropriate substitute provides equivalent bird habitat.");

  const html = `
    <div class="generation-notice no-print"><strong>Design generated.</strong> Review the concept below, then use the tabs to inspect the plant palette, full planting map, nursery list, warnings, score, region notes, and visual prompts.</div>
    ${inputs.bearMode === "attract" ? `<div class="generation-notice no-print" style="background:#fff3cd;border-color:#e6a817"><strong>Bear safety warning:</strong> Colorado Parks and Wildlife strongly discourages intentionally attracting black bears to residential yards. Bears that associate homes with food sources are often euthanized. Intentional wildlife feeding may violate local ordinances. This mode is provided for informational and restoration-context use only — not as a recommendation for typical residential planting.</div>` : ""}
    <p class="eyebrow">Generated concept</p>
    <h2>${esc(title)}</h2>
    <p>A ${esc(inputs.length)} × ${esc(inputs.depth)} foot ${esc(layoutTypeLabel(inputs.layoutType))} in ${siteLabel(inputs.sun)} for <strong>${esc(region.name)}</strong>, optimized for ${esc(goalListText(inputs).toLowerCase())}. Design mode: <strong>${esc(mode.label)}</strong>. The palette uses ${palette.length} plant species and about ${totalPlants} total plants.</p>
    <div class="pillbar">${makeSystemPills(palette)}</div>
    <div class="action-row no-print"><button type="button" class="secondary" onclick="PS.showTab('summary')">Show one-page summary</button><button type="button" class="secondary" onclick="PS.printDesignSheet()">Print / save PDF</button><button type="button" class="secondary" onclick="PS.showTab('prompt')">Visual prompt</button></div>
    <div class="tab-guide no-print"><strong>Next step:</strong> choose a tab below. Start with <span class="kbd">Layout</span> for the planting map, <span class="kbd">Plant palette</span> for plant cards, or <span class="kbd">Warnings</span> for review notes.</div>
    <div class="tabs no-print">
      <button type="button" class="tab active" onclick="PS.showTab('summary')">Plan summary</button>
      <button type="button" class="tab" onclick="PS.showTab('palette')">Plant palette</button>
      <button type="button" class="tab" onclick="PS.showTab('dataqa')">Fit + data QA</button>
      <button type="button" class="tab" onclick="PS.showTab('layout')">Layout</button>
      <button type="button" class="tab" onclick="PS.showTab('why')">Why generated</button>
      <button type="button" class="tab" onclick="PS.showTab('timeline')">Bloom timeline</button>
      <button type="button" class="tab" onclick="PS.showTab('seasonal')">Seasonal score</button>
      <button type="button" class="tab" onclick="PS.showTab('shopping')">Nursery list</button>
      <button type="button" class="tab" onclick="PS.showTab('materials')">Materials</button>
      <button type="button" class="tab" onclick="PS.showTab('care')">Establishment</button>
      <button type="button" class="tab" onclick="PS.showTab('risks')">Warnings</button>
      <button type="button" class="tab" onclick="PS.showTab('score')">Score</button>
      <button type="button" class="tab" onclick="PS.showTab('region')">Region notes</button>
      <button type="button" class="tab" onclick="PS.showTab('prompt')">Visual prompt</button>
      <button type="button" class="tab" onclick="PS.showTab('test')">Test this app</button>
      <button type="button" class="tab" onclick="PS.showTab('changelog')">Changelog</button>
    </div>
    <div id="tab-summary" class="tab-view active">${renderSummary(inputs, palette, score, region, title, totalPlants)}</div>
    <div id="tab-palette" class="tab-view">${renderPalette(palette, inputs)}</div>
    <div id="tab-dataqa" class="tab-view">${renderDataQA(inputs, palette)}</div>
    <div id="tab-layout" class="tab-view">${renderLayout(inputs, palette)}</div>
    <div id="tab-why" class="tab-view">${renderWhy(inputs, palette, score, region)}</div>
    <div id="tab-timeline" class="tab-view">${renderTimeline(palette)}</div>
    <div id="tab-seasonal" class="tab-view">${renderSeasonalScore(score.seasonal)}</div>
    <div id="tab-shopping" class="tab-view">${renderShoppingList(palette, inputs)}</div>
    <div id="tab-materials" class="tab-view">${renderMaterials(inputs)}</div>
    <div id="tab-care" class="tab-view">${renderCarePlan(inputs, palette)}</div>
    <div id="tab-risks" class="tab-view">${renderRiskPanel(inputs, palette, unique(warnings))}</div>
    <div id="tab-score" class="tab-view">${renderScore(score, inputs, palette)}</div>
    <div id="tab-region" class="tab-view">${renderRegionNotes(inputs, palette, region)}</div>
    <div id="tab-prompt" class="tab-view">${renderPrompt(inputs, palette, region)}</div>
    <div id="tab-test" class="tab-view">${renderTesting(inputs)}</div>
    <div id="tab-changelog" class="tab-view">${renderChangelog()}</div>
    <p class="muted"><strong>Prototype note:</strong> V4.0 uses region-specific starter data sets for 77429 (Houston / Gulf Coast) and 80906 (Colorado Springs / Front Range). Plant suitability, cultivar behavior, toxicity, local native range, and nursery availability still need expert/source validation before production use.</p>
  `;
  $("results").innerHTML = html;
  const resultsEl = $("results");
  if(resultsEl && resultsEl.scrollIntoView){
    setTimeout(() => resultsEl.scrollIntoView({behavior:"smooth", block:"start"}), 40);
  }
}

function unique(arr){return [...new Set(arr)];}

function makeSystemPills(palette){
  const checks = [
    ["Bee nectar/pollen", palette.some(p=>p.roles.bees>=8)],
    ["Butterfly nectar", palette.some(p=>p.roles.butterflies>=8)],
    ["Monarch host", palette.some(p=>p.tags.includes("monarch host"))],
    ["Fall migration nectar", palette.some(p=>p.tags.includes("monarch nectar") || p.tags.includes("late nectar") || p.tags.includes("fall bloom"))],
    ["Hummingbird nectar", palette.some(p=>p.roles.hummingbirds>=8)],
    ["Songbird seed/berries", palette.some(p=>p.tags.includes("songbird seed") || p.tags.includes("berries") || p.tags.includes("seed heads"))],
    ["Shelter/structure", palette.some(p=>p.tags.includes("structure") || p.tags.includes("cover") || p.tags.includes("overwintering habitat") || p.tags.includes("grass"))],
    ["Aromatic seating edge", palette.some(p=>p.tags.includes("aromatic edge") || p.tags.includes("mint family"))],
    ["Open-base / snake-aware", palette.some(p=>p.tags.includes("open base") || p.tags.includes("spiky edge") || p.tags.includes("snake-aware candidate"))]
  ];
  return checks.map(([label,on])=>`<span class="pill">${on?"✓":"—"} ${label}</span>`).join("");
}


function topRoles(p){
  return [
    ["Bees", p.roles.bees],
    ["Butterflies", p.roles.butterflies],
    ["Monarchs", p.roles.monarchs],
    ["Hummingbirds", p.roles.hummingbirds],
    ["Cardinals/songbirds", p.roles.cardinals]
  ].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]).join(" + ");
}

function bloomWindow(p){
  const b = p.bloom.slice().sort((a,b)=>a-b);
  return `${monthName[b[0]]}–${monthName[b[b.length-1]]}`;
}

function whySelected(p, inputs){
  const reasons = [];
  if(p.sun.includes(inputs.sun)) reasons.push(`matches ${siteLabel(inputs.sun)} exposure`);
  if(p.moist.includes(inputs.moisture)) reasons.push(`fits ${moistureLabel(inputs.moisture)} moisture`);
  if(inputs.soil !== "unknown" && (p.soil.includes(inputs.soil) || p.soil.includes("unknown"))) reasons.push(`compatible with ${soilLabel(inputs.soil, inputs.zip)}`);
  if(conditionMatches(p, inputs, false) && inputs.condition !== "standard") reasons.push(`handles ${conditionLabel(inputs.condition)}`);
  if(hasGoal(inputs, "bees") && p.roles.bees >= 8) reasons.push("prioritizes bee pollen/nectar value");
  if(hasGoal(inputs, "butterflies") && p.roles.butterflies >= 8) reasons.push("prioritizes butterfly nectar value");
  if(hasGoal(inputs, "monarchs") && p.tags.includes("monarch host")) reasons.push("adds a native monarch host plant");
  if(hasGoal(inputs, "hummingbirds") && (p.roles.hummingbirds >= 8 || p.color === "red")) reasons.push("prioritizes hummingbird nectar cues");
  if(hasGoal(inputs, "cardinals") && p.roles.cardinals >= 6) reasons.push("adds food or cover for cardinals/songbirds");
  if(hasGoal(inputs, "biodiversity") && p.tags.includes("late nectar")) reasons.push("extends late-season nectar for migration");
  if(hasGoal(inputs, "biodiversity") && p.tags.includes("overwintering habitat")) reasons.push("keeps overwintering structure in the design");
  if(inputs.hoa && p.tidy) reasons.push("keeps a tidier front-yard form");
  if(inputs.squirrelAware && p.squirrel <= 2) reasons.push("low squirrel-attractor score");
  if(inputs.mosquitoAware && (p.tags.includes("aromatic edge") || p.tags.includes("mint family"))) reasons.push("supports the mosquito-aware aromatic seating-edge add-on");
  if(!reasons.length) reasons.push("fills a missing layer, bloom window, or wildlife role");
  return unique(reasons).slice(0,4);
}

function placementGuidance(p, inputs){
  const profile = layoutProfile(inputs);
  const layer = p.layer === "back" ? profile.backPlacement : p.layer === "middle" ? "Use in repeated mid-bed drifts between the structural anchors and low edge plants." : profile.frontPlacement;
  const spread = p.spread[1] > 60 ? "Give it extra room or reduce quantity in small beds." : p.spread[1] <= 24 ? "Mass several together for visual weight." : "Space as a medium drift.";
  const constraint = p.aggressive ? "Edge or contain it if a tidy look matters." : p.pet ? "Keep on the pet-toxicity review list." : p.squirrel >= 4 ? "Shared berry/fruit resources may also interest squirrels." : "No special prototype constraint flagged.";
  return `${layer} ${spread} ${constraint}`;
}

function spacingRange(p, inputs){
  let low = Math.max(8, Math.round(p.spread[0] * 0.75));
  let high = Math.max(low + 2, Math.round(p.spread[1] * 0.85));

  // Woody anchors and large vines need clearance in inches too; do not switch to vague feet-only language.
  if(p.spread[1] > 60){
    low = Math.max(42, Math.round(p.spread[0] * 0.80));
    high = Math.max(low + 6, Math.round(p.spread[1] * 0.90));
  }

  if(inputs.designMode === "beginner") low = Math.min(high, Math.round(low * 1.05));
  if(inputs.designMode === "advanced") low = Math.max(8, Math.round(low * 0.95));

  return {low, high, label:`${low}–${high} in. on center`};
}

function spacingTableText(p, inputs){
  const r = spacingRange(p, inputs);
  if(p.qty <= 1) return `${r.low}–${r.high} in. from the nearest plant center`;
  return `${r.low}–${r.high} in. between plant centers`;
}

function spacingGuidance(p, inputs){
  const r = spacingRange(p, inputs);
  let base = `Plant ${r.label}; measure from the center of one plant to the center of the next.`;
  if(p.qty <= 1) base = `Place as a single anchor and keep roughly ${r.low}–${r.high} inches from the nearest neighboring plant center.`;
  if(p.spread[1] > 60) base += " This is a large plant; use the wide end of the range or reduce quantity in small beds.";
  if(p.layer === "front" && p.spread[1] <= 24) base += " Repeat in small groups so the edge reads as intentional.";
  if(inputs.condition === "patioContainer") base += " In containers, treat this as pot/root-zone width guidance rather than forcing every selected species into one pot.";
  return base;
}

function plantingInstructions(p, inputs){
  const steps = [];
  const isWoody = p.tags.includes("shrub") || p.tags.includes("vine") || p.height[1] > 72;
  const isGrass = p.tags.includes("grass");
  const isGroundcover = p.tags.includes("groundcover");
  const isContainerSite = inputs.condition === "patioContainer";
  const isWetSite = inputs.moisture === "wet" || inputs.condition === "rainGarden" || inputs.condition === "floodEdge";
  const isClay = inputs.soil === "clay" || inputs.condition === "gumboClay" || inputs.condition === "heavyClay";

  if(isContainerSite){
    steps.push(`Use a container with drainage holes; choose ${containerSuggestion(p, inputs).toLowerCase()} and avoid water-holding saucers if mosquito-aware mode is on.`);
  } else {
    steps.push(`Lay out plants first using the Layout tab spacing table; for this plant, mark centers ${spacingTableText(p, inputs).toLowerCase()}.`);
  }

  if(isWoody){
    steps.push("Dig a hole about two times wider than the root ball and no deeper than the root ball; keep the top of the root ball at or slightly above surrounding grade.");
  } else if(isGrass){
    steps.push("Dig only as deep as the plug or pot; keep the grass crown level with the soil surface and do not bury the center crown.");
  } else {
    steps.push("Dig a hole as deep as the pot or plug and wider than the root mass; set the crown level with the surrounding soil, not buried.");
  }

  if(isClay){
    const clayNote = inputs.zip === "80906"
      ? "In clay soil, roughen the sides of the hole, backfill mostly with loosened native soil, and avoid creating a bowl that traps water."
      : "In gumbo clay, roughen the sides of the hole, backfill mostly with loosened native soil, and avoid creating a slick clay bowl full of amended potting mix.";
    steps.push(clayNote);
  } else if(inputs.soil === "sandy" || inputs.condition === "coastalExposure") {
    steps.push("In sandy or coastal soil, water the root ball before planting and mulch after planting to slow drying at the surface.");
  } else {
    steps.push("Backfill with the soil removed from the hole; firm gently enough to remove air pockets without compacting the bed.");
  }

  if(p.tags.includes("vine")) steps.push("Install the trellis, fence tie, obelisk, or support before planting so new stems can be trained without breaking later; use a freestanding support when the layout is not a fence-line planting.");
  if(p.aggressive || isGroundcover) steps.push("Install edging or define a maintenance line now; spreading plants are easier to manage before they knit into nearby species.");
  if(isWetSite && (p.moist.includes("wet") || p.tags.includes("wet soil"))) steps.push("Place in the lower, slower-draining pocket, but keep the crown at grade so it is moist rather than buried.");
  if(isWetSite && !p.moist.includes("wet")) steps.push("Use this plant on the upper shoulder of the rain-garden edge, not in the lowest standing-water pocket.");

  steps.push("Water in slowly at the root ball immediately after planting; refill settled soil only to the original crown/root-ball height.");
  steps.push("Mulch 1–2 inches deep around the plant, leaving a small open ring around stems or crowns so mulch does not sit against the plant base.");

  if(inputs.condition === "urbanHeat" || inputs.condition === "streetHellstrip") steps.push("For reflected-heat sites, plant during a cooler part of the day and check moisture frequently during the first growing season.");
  if(inputs.squirrelAware) steps.push("If squirrels dig in fresh soil, pin down temporary hardware-cloth squares, jute netting, or small stones between plants until roots anchor.");
  if(inputs.mosquitoAware) steps.push("Do not leave water standing in trays, buckets, low saucers, or decorative containers near the planting edge.");
  return unique(steps).slice(0,8);
}

function renderPlantingBox(p, inputs){
  const steps = plantingInstructions(p, inputs);
  return `<div class="planting-box"><h4>How to plant</h4><ol>${steps.map(step=>`<li>${esc(step)}</li>`).join("")}</ol><div class="install-alert"><strong>Establishment:</strong> Keep the original root ball evenly moist while new roots move into surrounding soil; adjust frequency for rain, heat, container size, and drainage.</div></div>`;
}


function renderPlantCareSnippet(p, inputs){
  const items = [];
  if(inputs.condition === "patioContainer") items.push("Check containers more often than in-ground beds; water until it drains, then empty saucers so they do not hold mosquito-breeding water.");
  else if(inputs.moisture === "wet" || inputs.condition === "rainGarden" || inputs.condition === "floodEdge") items.push("During the first season, keep crowns visible and avoid burying wet-site plants under mulch or sediment after heavy rain.");
  else if(inputs.soil === "clay" || inputs.condition === "gumboClay" || inputs.condition === "heavyClay") items.push("In clay, water the original root ball slowly; surrounding soil may look damp while the nursery root ball dries out.");
  else items.push("Water deeply during establishment, then taper once new growth shows the plant is rooting into surrounding soil.");
  if(p.aggressive) items.push("Edit spread after flowering or before seedlings/runners move into neighboring drifts.");
  if(p.tags.includes("seed heads") || p.tags.includes("overwintering habitat") || p.tags.includes("grass")) items.push("Leave some stems or seed heads through winter for insects, birds, and structure; cut back selectively, not all at once.");
  if(p.tags.includes("monarch host") || p.tags.includes("butterfly host")) items.push("Expect leaf chewing if caterpillars use this plant; place host plants in an intentional patch so damage reads as habitat.");
  if(!items.length) items.push("Keep mulched but not buried, weed around it while small, and avoid over-fertilizing, which causes floppy growth and reduces plant vigor.");
  return `<div class="care-note"><h4>First-season care</h4><ul>${unique(items).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
}

function renderListCard(title, items, cls="logic-card"){
  return `<article class="${cls}"><h3>${esc(title)}</h3><ul class="logic-list">${items.map(item=>`<li>${esc(item)}</li>`).join("")}</ul></article>`;
}

function waterPlan(inputs){
  const plan = [];
  if(inputs.condition === "patioContainer") plan.push("Containers need drainage holes and more frequent checks than in-ground beds; empty saucers after watering or rain.");
  if(inputs.moisture === "dry" || inputs.condition === "streetHellstrip" || inputs.condition === "urbanHeat") plan.push("Dry or reflected-heat sites need slower, deeper watering during establishment so the root ball rehydrates, not just the mulch surface.");
  if(inputs.soil === "clay" || inputs.condition === "gumboClay" || inputs.condition === "heavyClay") plan.push("Clay can create a wet outer hole and a dry nursery root ball; check the root ball itself before adding more water.");
  if(inputs.moisture === "wet" || inputs.condition === "rainGarden" || inputs.condition === "floodEdge") plan.push("Wet-site plants still need establishment water during dry spells, but crowns should remain at grade rather than buried or constantly submerged.");
  if(!plan.length) plan.push("For average soil, water deeply at planting and keep the root ball evenly moist while new roots move into surrounding soil.");
  return unique(plan);
}

function mulchPlan(inputs){
  const items = ["Use mulch as a weed and moisture buffer, not as a mound against crowns or stems.", "Keep a visible planting ring around new crowns so rot, ants, and hidden stem damage are easier to spot.", "Hand-weed early before small native plugs are shaded or crowded by turf and warm-season weeds."];
  if(inputs.condition === "rainGarden" || inputs.condition === "floodEdge") items.push("In flow paths, use mulch carefully so it does not wash over crowns or clog the low point after storms.");
  if(inputs.condition === "streetHellstrip" || inputs.condition === "urbanHeat") items.push("Along pavement, mulch reduces surface heating, but avoid piling it into curb runoff areas.");
  return items;
}

function pruningPlan(inputs, palette){
  const items = ["Avoid cutting everything to the ground at once; leave some stems, seed heads, and grass structure for overwintering insects and birds.", "Cut back selectively where plants block paths, sightlines, labels, or front-yard legibility.", "After flowering, edit aggressive spreaders before they overtake slower plants."];
  if(hasGoal(inputs,"cardinals")) items.push("Retain some dense cover and seed-bearing structure for songbirds rather than making the bed fully bare in winter.");
  if(palette.some(p=>p.tags.includes("monarch host") || p.tags.includes("butterfly host"))) items.push("Do not remove host plants just because leaves are chewed; caterpillar feeding is part of the design intent.");
  return items;
}

function messyCues(inputs, palette){
  const cues = ["Repeat plants in drifts so ecological planting reads as intentional rather than random.", "Use a clean front edge, mulch path, stones, or low groundcover to frame taller habitat plants.", "Leave some seed heads, hollow stems, and grasses, but remove plants that lean into walkways or bury neighbors."];
  if(palette.some(p=>p.aggressive)) cues.push("Contain vigorous spreaders with an edge or maintenance line so habitat value does not become bed takeover.");
  if(inputs.hoa || inputs.condition === "hoaFront") cues.push("For HOA-visible beds, keep the first 12–18 inches lower and tidier while placing taller habitat behind it.");
  return cues;
}

function failureWarnings(inputs, palette){
  const warnings = ["Planting too deep is a common failure point; keep the crown/root flare at grade.", "Do not let mulch touch stems or crowns.", "Water the original root ball during establishment, not only the surrounding soil."];
  if(inputs.soil === "clay" || inputs.condition === "gumboClay" || inputs.condition === "heavyClay"){
    const w = inputs.zip === "80906"
      ? "In clay soil, avoid a smooth-sided planting hole; roughen sides and avoid burying crowns in heavily amended pockets."
      : "In gumbo clay, avoid a smooth-sided bathtub hole; roughen sides and avoid burying crowns in amended pockets.";
    warnings.push(w);
  }
  if(inputs.condition === "streetHellstrip" || inputs.condition === "urbanHeat") warnings.push("Reflected heat can cook small plugs; plant in cooler weather or protect/check more often during the first summer.");
  if(inputs.condition === "patioContainer") warnings.push("Containers fail quickly without drainage; no closed pots or permanently wet saucers.");
  if(inputs.moisture === "wet" || inputs.condition === "rainGarden" || inputs.condition === "floodEdge") warnings.push("Wet-tolerant does not mean the crown should be buried in saturated mulch.");
  if(palette.some(p=>p.aggressive)) warnings.push("Aggressive native spreaders are useful habitat plants only if you actively define their boundary.");
  if(inputs.snakeAware) warnings.push("Snake-aware mode needs visible, open bases: avoid wood piles, dense low groundcover, heavy leaf litter against the house, and rodent-feeding clutter near the planting.");
  return unique(warnings);
}


function speciesSpecificity(p){
  if(/spp\.|\/ spp\.|sp\./i.test(p.sci)) return {label:"Genus-level / species group", level:"medium", note:"Exact species or locally available cultivar should be verified before purchase."};
  if(/var\.|subsp\./i.test(p.sci)) return {label:"Species + variety", level:"high", note:"Record is more specific than genus level; still verify local nursery stock."};
  return {label:"Species-level", level:"high", note:"Record uses a specific botanical name in the starter dataset."};
}

function dataConfidence(p){
  const specificity = speciesSpecificity(p);
  const needsLocal = specificity.level !== "high" || p.sci.includes("/") || p.common.includes("Seaside / tall") || p.common.includes("Gulf Coast fall aster");
  const cautions = [];
  if(needsLocal) cautions.push("verify exact species/local nursery source");
  if(p.pet) cautions.push("toxicity-review flag");
  if(p.aggressive) cautions.push("spread-management flag");
  if(p.deer) cautions.push("deer-resistance is not guaranteed");
  if(p.tags.includes("aromatic edge") || p.tags.includes("mint family")) cautions.push("aromatic edge is not mosquito control");
  let overall = "Higher confidence prototype record";
  if(needsLocal) overall = "Medium confidence — local species verification needed";
  if(p.pet || p.aggressive) overall = needsLocal ? "Medium confidence with caution flags" : "Higher confidence with caution flags";
  return {
    overall,
    specificity:specificity.label,
    nativeRange:p.native ? "Native flag present; verify county/ecoregion before production use" : "Non-native or not flagged native",
    bloom:"Prototype bloom window; verify timing for your region and microclimate",
    wildlife:"Wildlife role is rule-based from plant traits/tags, not field-observed performance scoring",
    source:needsLocal ? "Needs local nursery/source verification" : "Starter source-supported record; still verify availability",
    cautions:cautions.length ? cautions : ["no major data flags in prototype record"],
    note:specificity.note
  };
}

function exclusionReasons(p, inputs){
  const reasons = [];
  if(inputs.nativeOnly && !p.native) reasons.push("not native-only");
  if(!p.sun.includes(inputs.sun)) reasons.push(`sun mismatch: needs ${p.sun.join("/")}`);
  if(!p.moist.includes(inputs.moisture)) reasons.push(`moisture mismatch: prefers ${p.moist.join("/")}`);
  if(!conditionMatches(p, inputs, true)) reasons.push(`micro-site mismatch: ${conditionLabel(inputs.condition)}`);
  if(inputs.soil !== "unknown" && !p.soil.includes(inputs.soil) && !p.soil.includes("unknown")) reasons.push(`soil mismatch: ${soilLabel(inputs.soil, inputs.zip)}`);
  if(inputs.petSafe && p.pet) reasons.push("toxicity-review plant removed");
  if(inputs.deer && !p.deer) reasons.push("not deer-resistance candidate");
  if(inputs.squirrelAware && p.squirrel >= 4 && !hasGoal(inputs, "cardinals")) reasons.push("high squirrel/shared wildlife attractor");
  if(inputs.designMode === "beginner" && (p.aggressive || p.pet || p.height[1] > 96 || p.tags.includes("vine"))) reasons.push("beginner mode suppresses vigorous/toxicity/large/vine records");
  if(inputs.designMode === "beginner" && inputs.hoa && !p.tidy) reasons.push("beginner + HOA wants tidier plants");
  if(inputs.hoa && isFrontYardStyle(inputs.style) && !p.tidy && p.aggressive && inputs.designMode !== "advanced") reasons.push("front-yard/HOA filter suppresses aggressive untidy plants");
  const area = inputs.length * inputs.depth;
  if(area < 70 && p.spread[1] > 60) reasons.push("too wide for bed size");
  if(area < 55 && p.height[1] > 72) reasons.push("too tall for small bed");
  return unique(reasons);
}

function fitReview(p, inputs){
  const exclusions = exclusionReasons(p, inputs);
  const cautions = [];
  if(p.aggressive) cautions.push("manage spread");
  if(p.pet) cautions.push("toxicity review");
  if(p.squirrel >= 3 && inputs.squirrelAware) cautions.push("squirrel tradeoff");
  if(speciesSpecificity(p).level !== "high") cautions.push("exact species verification");
  if(inputs.condition !== "standard" && !conditionMatches(p, inputs, false)) cautions.push("condition fit is weak");
  if(exclusions.length) return {label:"Possible fit", cls:"fit-possible", reasons:exclusions.concat(cautions).slice(0,5)};
  if(cautions.length) return {label:"Use with caution", cls:"fit-caution", reasons:cautions};
  return {label:"Good fit", cls:"fit-good", reasons:["matches active sun/moisture/soil/site filters"]};
}

function summaryDataQA(palette){
  const high = palette.filter(p=>dataConfidence(p).overall.startsWith("Higher")).length;
  const medium = palette.length - high;
  const speciesGroup = palette.filter(p=>speciesSpecificity(p).level !== "high").map(p=>p.common);
  const caution = palette.filter(p=>p.aggressive || p.pet).map(p=>p.common);
  const out = [`${high} of ${palette.length} selected records are higher-confidence starter records.`, `${medium} selected records need extra local/species/source review.`];
  if(speciesGroup.length) out.push(`Exact species verification needed for: ${speciesGroup.slice(0,5).join(", ")}${speciesGroup.length>5?"…":""}.`);
  if(caution.length) out.push(`Caution flags appear on: ${caution.slice(0,6).join(", ")}${caution.length>6?"…":""}.`);
  out.push("Before production use, attach per-record source URLs, county/native-range notes, and local nursery availability.");
  return out;
}

function renderDataQA(inputs, palette){
  const regionPlants = plants.filter(p => p.location.some(loc => inputs.locations.includes(loc)));
  const selectedIds = new Set(palette.map(p=>p.id));
  const fitGroups = palette.reduce((acc,p)=>{ const f=fitReview(p, inputs); acc[f.label]=(acc[f.label]||0)+1; return acc; },{});
  const high = palette.filter(p=>dataConfidence(p).overall.startsWith("Higher")).length;
  const exact = palette.filter(p=>speciesSpecificity(p).level === "high").length;
  const excluded = regionPlants.filter(p=>!selectedIds.has(p.id)).map(p=>({p, reasons:exclusionReasons(p, inputs)})).filter(x=>x.reasons.length).slice(0,10);
  const rows = palette.map(p=>{
    const f = fitReview(p, inputs);
    const d = dataConfidence(p);
    return `<tr><td><strong>${esc(p.common)}</strong><br><span class="sciname">${esc(p.sci)}</span></td><td><span class="chip ${f.cls}">${esc(f.label)}</span><br>${f.reasons.map(r=>`<span class="chip">${esc(r)}</span>`).join("")}</td><td><strong>${esc(d.overall)}</strong><br>${d.cautions.map(c=>`<span class="chip ${c.includes("caution")||c.includes("toxicity")||c.includes("spread")?"red":""}">${esc(c)}</span>`).join("")}</td><td>${esc(d.specificity)}<br><span class="muted">${esc(d.source)}</span></td></tr>`;
  }).join("");
  const excludedRows = excluded.map(x=>`<tr><td><strong>${esc(x.p.common)}</strong><br><span class="sciname">${esc(x.p.sci)}</span></td><td>${x.reasons.slice(0,5).map(r=>`<span class="chip fit-excluded">${esc(r)}</span>`).join("")}</td><td>${esc(topRoles(x.p))}</td></tr>`).join("");
  return `<div class="info"><strong>V4.0 data QA:</strong> this tab makes the prototype's confidence limits visible. It is not a fully sourced plant database yet; it shows which records are solid starter candidates, which need exact species/local nursery verification, and why some candidates were excluded.</div>
  <div class="qa-grid">
    <div class="qa-card"><strong>${palette.length}</strong><span class="muted">selected species</span></div>
    <div class="qa-card"><strong>${high}/${palette.length}</strong><span class="muted">higher-confidence starter records</span></div>
    <div class="qa-card"><strong>${exact}/${palette.length}</strong><span class="muted">species-level records</span></div>
  </div>
  <div class="logic-grid">
    <article class="logic-card good"><h3>Fit counts</h3><p>${Object.entries(fitGroups).map(([k,v])=>`<span class="chip">${esc(k)}: ${v}</span>`).join("")}</p></article>
    <article class="logic-card caution"><h3>Production data still needed</h3><ul class="logic-list"><li>Per-plant source URL and date checked.</li><li>County/ecoregion native-range verification.</li><li>Bloom-window confidence for ${inputs.zip === "80906" ? "Front Range" : "Houston-area"} microclimates.</li><li>Nursery availability and exact species/cultivar notes.</li><li>Clear toxicity and deer-resistance source status.</li></ul></article>
  </div>
  <h3>Selected plant fit and data confidence</h3>
  <table class="qa-table"><thead><tr><th>Plant</th><th>Fit review</th><th>Data confidence / cautions</th><th>Specificity / source status</th></tr></thead><tbody>${rows}</tbody></table>
  <h3>Examples excluded by current filters</h3>
  ${excludedRows ? `<table class="qa-table"><thead><tr><th>Candidate</th><th>Excluded because</th><th>Wildlife value</th></tr></thead><tbody>${excludedRows}</tbody></table>` : `<div class="status">No obvious exclusions under the current inputs; most starter records were eligible.</div>`}
  <p class="muted">Fit labels are rule-based: <strong>Good fit</strong> means active site filters match; <strong>Use with caution</strong> means the plant fits but has management/data flags; <strong>Possible fit</strong> means it appeared through fallback/substitution behavior and should be reviewed before purchase.</p>`;
}

function renderCarePlan(inputs, palette){
  const day30 = ["Water in slowly after planting and keep the original root balls evenly moist while roots establish.", "Check plants after heavy rain or heat; reset any crowns buried by mulch, runoff, or settling soil.", "Weed early and often so small plugs are not overtopped.", "Replace dead plugs quickly if seasonal timing still allows establishment."];
  const day60 = ["Begin tapering irrigation only when plants show new growth and the root ball is no longer drying faster than the surrounding soil.", "Edit spreaders, train vines, and keep the front edge readable.", "Confirm that wet-pocket plants are not buried and dry-pocket plants are not sitting in standing water."];
  const day90 = ["Shift from installation watering to weather-based watering; containers and heat edges still need closer checks.", "Leave selected seed heads and stems where they support habitat and do not block access.", "Review weak seasonal coverage and plan any fall or spring additions as substitutions, not as random extras."];
  return `<div class="logic-grid">
    ${renderListCard("First 30 days", day30, "logic-card good")}
    ${renderListCard("Days 31–60", day60, "logic-card good")}
    ${renderListCard("Days 61–90", day90, "logic-card good")}
    ${renderListCard("Watering by condition", waterPlan(inputs))}
    ${renderListCard("Mulch and weed control", mulchPlan(inputs))}
    ${renderListCard("Pruning / cutback", pruningPlan(inputs, palette))}
    ${renderListCard("Intentional habitat cues", messyCues(inputs, palette))}
    ${renderListCard("Common planting failure warnings", failureWarnings(inputs, palette), "logic-card caution")}
  </div><p class="muted">This is design-adjacent establishment guidance. V4.0 does not create reminders, journals, or care logs.</p>`;
}

function bearBadge(p, inputs){
  if(!p.bear || inputs.zip !== "80906") return "";
  const cls = inputs.bearMode === "reduce" ? " prominent" : "";
  return `<span class="bear-badge${cls}" title="Bear attractant" aria-label="Bear attractant" role="img">🐻</span>`;
}

function renderPalette(palette, inputs){
  const hasBear = inputs.zip === "80906" && palette.some(p => p.bear);
  const bearLegend = hasBear ? `<p class="bear-legend"><span aria-hidden="true">🐻</span> = bear attractant — see the <strong>Bear activity</strong> setting in Garden inputs.</p>` : "";
  return bearLegend + `<p class="photo-note"><strong>Plant images:</strong> V2.6 adds a top-right reference image slot to each plant card. The included images are local reference illustrations/placeholders so the app works offline; replace them with verified plant photos and credits before public release.</p><div class="card-grid">` + palette.map(p=>`<article class="plant-card">
    <div class="plant-card-head">
      <div class="plant-title">
        <h3>${esc(p.common)}${bearBadge(p, inputs)}</h3>
        <div class="sciname">${esc(p.sci)}</div>
      </div>
      ${plantImageFigure(p)}
    </div>
    <div>${p.tags.map(t=>`<span class="chip ${chipClass(t)}">${esc(t)}</span>`).join("")}</div>
    <div class="plant-meta">
      <div><strong>Quantity</strong>${p.qty}</div>
      <div><strong>Layer</strong>${esc(layerLabel(p.layer))}</div>
      <div><strong>Bloom</strong>${esc(bloomWindow(p))}</div>
      <div><strong>Wildlife value</strong>${esc(topRoles(p))}</div>
      <div><strong>Size</strong>${p.height[0]}–${p.height[1]} in. tall<br>${p.spread[0]}–${p.spread[1]} in. spread</div>
      <div><strong>Site fit</strong><span class="chip ${fitReview(p, inputs).cls}">${esc(fitReview(p, inputs).label)}</span><br>${fitReview(p, inputs).reasons.slice(0,2).map(r=>esc(r)).join("; ")}</div>
      <div><strong>Data QA</strong>${esc(dataConfidence(p).overall)}<br>${esc(speciesSpecificity(p).label)}</div>
      <div><strong>Mode guidance</strong>${esc(modePlantGuidance(p, inputs))}</div>
      <div><strong>Spacing</strong>See Layout tab for exact center-to-center inches.</div>
    </div>
    <p>${esc(p.notes)}</p>
    <div class="data-note"><strong>Cautions:</strong> ${dataConfidence(p).cautions.map(c=>`<span class="chip ${c.includes("toxicity")||c.includes("spread")?"red":""}">${esc(c)}</span>`).join("")}<br><strong>Source status:</strong> ${esc(dataConfidence(p).source)}. ${esc(dataConfidence(p).note)}</div>
    <div class="backup-box"><strong>If nursery is out of this plant</strong>${esc(backupText(p, inputs, palette))}</div>
    <p><strong>Placement:</strong> ${esc(placementGuidance(p, inputs))}</p>
    ${renderPlantingBox(p, inputs)}
    ${renderPlantCareSnippet(p, inputs)}
    <ul class="why-list">${whySelected(p, inputs).map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
  </article>`).join("") + `</div>`;
}

function plantImageFigure(p){
  const src = `img/plants/${p.id}.svg`;
  return `<button type="button" class="plant-photo-button" onclick="PS.openPlantImage('${esc(p.id)}')" aria-label="Open larger reference image for ${esc(p.common)}"><img src="${esc(src)}" alt="Reference image for ${esc(p.common)}" loading="lazy" onerror="this.parentElement.classList.add('photo-missing');this.parentElement.innerHTML='Photo coming soon';"><span>Reference image</span></button>`;
}

function openPlantImage(id){
  const p = plants.find(x => x.id === id);
  if(!p) return;
  let modal = $('plantImageModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'plantImageModal';
    modal.className = 'plant-image-modal';
    modal.addEventListener('click', e => { if(e.target === modal) closePlantImage(); });
    document.body.appendChild(modal);
  }
  const src = `img/plants/${p.id}.svg`;
  modal.innerHTML = `<div class="plant-image-dialog" role="dialog" aria-modal="true" aria-label="Plant reference image"><img src="${esc(src)}" alt="Reference image for ${esc(p.common)}"><h3>${esc(p.common)}</h3><div class="sciname">${esc(p.sci)}</div><p class="muted">Reference illustration / photo slot for prototype use. Replace with a verified species photo and source credit before public release.</p><button type="button" class="secondary" onclick="PS.closePlantImage()">Close image</button></div>`;
  modal.classList.add('active');
}
function closePlantImage(){ const modal = $('plantImageModal'); if(modal) modal.classList.remove('active'); }

function chipClass(t){
  if(t.includes("hummingbirds") || t.includes("red") || t.includes("berries")) return "red";
  if(t.includes("wet") || t.includes("coastal") || t.includes("rain")) return "blue";
  return "";
}

function gardenZones(inputs, palette){
  const by = fn => palette.filter(fn).map(p=>p.common);
  const profile = layoutProfile(inputs);
  const zones = [
    {tag:profile.structureTag, title:profile.structureTitle, plants:by(p=>p.layer==="back"), why:profile.structureWhy},
    {tag:"Middle drift", title:"Repeated nectar and host layer", plants:by(p=>p.layer==="middle"), why:"Groups of 3–7 repeated mid-height plants carry the main pollinator color and make the design legible."},
    {tag:"Low edge", title:"Front/outer edge", plants:by(p=>p.layer==="front"), why:profile.frontWhy},
    {tag:"Host patch", title:"Monarch and butterfly host cluster", plants:by(p=>p.tags.includes("monarch host") || p.tags.includes("butterfly host")), why:"Host plants should be grouped so caterpillar chewing looks intentional, not like random plant damage."},
    {tag:"Late nectar", title:"Fall migration nectar lane", plants:by(p=>p.tags.includes("late nectar") || p.tags.includes("monarch nectar") || p.bloom.includes(10)), why:inputs.zip === "80906" ? "Colorado Front Range fall nectar supports monarch migration and late-season native pollinators." : "Texas Gulf Coast fall nectar is important for monarch migration and late-season pollinators."}
  ];
  if(inputs.condition === "rainGarden" || inputs.condition === "floodEdge" || inputs.layoutType === "rainPocket") zones.push({tag:"Wet pocket", title:"Rain-garden low point", plants:by(p=>p.moist.includes("wet") || p.tags.includes("wet soil")), why:"Wet-tolerant plants should sit in the lowest or slowest-draining part of the bed."});
  if(inputs.condition === "streetHellstrip" || inputs.condition === "urbanHeat" || inputs.layoutType === "curbStrip") zones.push({tag:"Heat edge", title:"Curb/reflected-heat buffer", plants:by(p=>p.conditions.includes("urbanHeat") || p.moist.includes("dry")), why:"Tougher plants go along pavement, driveways, walls, or curb edges where reflected heat is highest."});
  if(hasGoal(inputs, "cardinals")) zones.push({tag:"Bird cover", title:"Dense cover and food", plants:by(p=>p.tags.includes("berries") || p.tags.includes("seed heads") || p.tags.includes("cover") || p.tags.includes("evergreen cover")), why:"Bird habitat needs structure and seasonal food, not only flowers."});
  if(palette.some(p=>p.tags.includes("vine"))) zones.push({tag:"Vertical support", title:profile.supportTitle, plants:by(p=>p.tags.includes("vine")), why:profile.supportWhy});
  if(inputs.mosquitoAware) zones.push({tag:"Comfort edge", title:"Aromatic seating-edge companion strip", plants:by(p=>p.tags.includes("aromatic edge") || p.tags.includes("mint family")), why:"Aromatic plants are placed near patios or paths as a human-comfort add-on, not as a mosquito-control guarantee."});
  zones.push({tag:"Access", title:"Maintenance/viewing gap", plants:["Mulch stepping gap or narrow access strip"], why:"Even habitat-forward beds need a way to reach shrubs, edit spreaders, and keep a tidy edge."});
  return zones.filter(z=>z.plants.length);
}

function renderZoneCards(inputs, palette){
  return `<div class="zone-grid">` + gardenZones(inputs, palette).map(z=>`<article class="zone-card"><span class="zone-tag">${esc(z.tag)}</span><h3>${esc(z.title)}</h3><p>${esc(z.why)}</p><p>${z.plants.slice(0,7).map(p=>`<span class="chip">${esc(p)}</span>`).join("")}</p></article>`).join("") + `</div>`;
}

function mapRows(palette){
  const ordered = [];
  ["back","middle","front"].forEach(layer => palette.filter(p=>p.layer===layer).forEach(p=>ordered.push(p)));
  return ordered;
}

function effectiveDiagramShape(inputs, profile){
  if(profile.shape === "strip" || profile.shape === "cluster") return profile.shape;
  if(inputs.layoutType === "rainPocket") return inputs.bedShape || "oval";
  return inputs.bedShape || (profile.shape === "island" ? "oval" : "rectangle");
}

function fullPlantInstances(inputs, palette){
  const profile = layoutProfile(inputs);
  const diagramShape = effectiveDiagramShape(inputs, profile);
  const W = 760, H = 370, pad = 54;
  const layers = {back: [], middle: [], front: []};
  mapRows(palette).forEach(p => {
    for(let i=0;i<p.qty;i++) layers[p.layer || "middle"].push({plant:p});
  });
  const rowY = (diagramShape === "oval" || diagramShape === "circle" || diagramShape === "kidney")
    ? {back:132, middle:204, front:282}
    : diagramShape === "strip"
      ? {back:112, middle:196, front:282}
      : diagramShape === "cluster"
        ? {back:118, middle:202, front:284}
        : {back:98, middle:194, front:290};
  let n = 1;
  const all = [];
  Object.entries(layers).forEach(([layer, arr]) => {
    arr.forEach((item, i) => {
      const count = Math.max(1, arr.length);
      let x = pad + ((i + 1) * (W - pad * 2) / (count + 1));
      let y = rowY[layer] + ((i % 3) - 1) * 12;
      if(["oval","circle","kidney"].includes(diagramShape)){
        const center = W / 2;
        const pull = layer === "back" ? 0.72 : layer === "middle" ? 0.88 : 0.98;
        x = center + (x - center) * pull;
      }
      if(diagramShape === "circle"){
        const center = W / 2;
        x = center + (x - center) * 0.86;
        if(layer === "back") y += 4;
        if(layer === "front") y -= 4;
      }
      if(diagramShape === "kidney"){
        const center = W / 2;
        const sweep = (x - center) / 210;
        y += Math.round(Math.sin(sweep) * (layer === "middle" ? 12 : 8));
        if(x > center + 70) y += layer === "back" ? -10 : layer === "front" ? 10 : 2;
      }
      if(diagramShape === "corner"){
        if(x > W * 0.68){
          y -= layer === "back" ? 34 : layer === "middle" ? 14 : -6;
        }
      }
      if(diagramShape === "cluster"){
        y += (i % 2 ? 18 : -8);
      }
      all.push({number:n++, plant:item.plant, layer, x:Math.round(x), y:Math.round(y)});
    });
  });
  return all;
}

function numberRange(nums){
  if(!nums.length) return "";
  nums = nums.slice().sort((a,b)=>a-b);
  const ranges = [];
  let start = nums[0], prev = nums[0];
  for(let i=1;i<nums.length;i++){
    if(nums[i] === prev + 1) prev = nums[i];
    else { ranges.push(start === prev ? String(start) : `${start}–${prev}`); start = prev = nums[i]; }
  }
  ranges.push(start === prev ? String(start) : `${start}–${prev}`);
  return ranges.join(", ");
}

function renderSpecificPlacementTable(inputs, palette, instances){
  const rows = mapRows(palette).map(p => {
    const nums = instances.filter(i=>i.plant.id===p.id).map(i=>i.number);
    return `<tr><td><strong>${esc(numberRange(nums))}</strong></td><td><strong>${esc(p.common)}</strong><br><span class="sciname">${esc(p.sci)}</span></td><td>${p.qty}</td><td>${esc(layerLabel(p.layer))}</td><td><strong>${esc(spacingTableText(p, inputs))}</strong><br><span class="muted">On center = center of one plant to center of the next.</span></td><td>${esc(placementGuidance(p, inputs))}</td></tr>`;
  }).join("");
  return `<h3>Specific placement and spacing table</h3><div class="info"><strong>Spacing rule:</strong> distances below are in inches. Measure from the center of one plant to the center of the next plant. For a single shrub, vine, or large anchor, use the listed distance as clearance from the nearest neighboring plant center. The numbered map is a placement guide; use this table for the actual spacing.</div><table><thead><tr><th>Map #</th><th>Plant</th><th>Qty</th><th>Layer</th><th>Distance to next plant</th><th>Placement guidance</th></tr></thead><tbody>${rows}</tbody></table>`;
}


function formatFeetInches(totalInches){
  const inches = Math.max(0, Math.round(totalInches));
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  if(ft && rem) return `${ft} ft ${rem} in`;
  if(ft) return `${ft} ft`;
  return `${rem} in`;
}

function mapBedBounds(inputs, profile, W, H){
  const diagramShape = effectiveDiagramShape(inputs, profile);
  if(diagramShape === "oval") return {left:42, top:40, right:718, bottom:336};
  if(diagramShape === "circle") return {left:156, top:36, right:604, bottom:334};
  if(diagramShape === "kidney") return {left:54, top:44, right:712, bottom:334};
  if(diagramShape === "rectangle") return {left:32, top:46, right:728, bottom:328};
  if(diagramShape === "corner") return {left:22, top:28, right:736, bottom:336};
  if(diagramShape === "strip") return {left:20, top:58, right:740, bottom:306};
  if(diagramShape === "cluster") return {left:20, top:42, right:740, bottom:316};
  return {left:16, top:16, right:W-16, bottom:H-16};
}

function mapDimensionOverlay(inputs, profile, W, H){
  // Dimensions are listed in the legend instead of drawn on the map so plant markers stay readable.
  return "";
}

function mapGuideOverlay(inputs, profile, W, H){
  const b = mapBedBounds(inputs, profile, W, H);
  const bedHeight = b.bottom - b.top;
  const y1 = Math.round(b.top + bedHeight / 3);
  const y2 = Math.round(b.top + bedHeight * 2 / 3);
  const lineX1 = b.left + 14;
  const lineX2 = b.right - 14;
  return `
    <line x1="${lineX1}" y1="${y1}" x2="${lineX2}" y2="${y1}" stroke="#c9bca5" stroke-dasharray="7 7" stroke-width="2" opacity=".82"></line>
    <line x1="${lineX1}" y1="${y2}" x2="${lineX2}" y2="${y2}" stroke="#c9bca5" stroke-dasharray="7 7" stroke-width="2" opacity=".82"></line>`;
}

function renderMapScaleLegend(inputs, guideOne, guideTwo){
  return `<aside class="map-legend" aria-label="Map scale and guide line measurements">
    <h3>Map scale + guide lines</h3>
    <div class="map-legend-row"><span>Bed length</span><strong>${esc(inputs.length)} ft</strong></div>
    <div class="map-legend-row"><span>Bed width/depth</span><strong>${esc(inputs.depth)} ft</strong></div>
    <div class="map-legend-row"><span>Dotted guide 1</span><strong>~${esc(guideOne)} from back/top edge</strong></div>
    <div class="map-legend-row"><span>Dotted guide 2</span><strong>~${esc(guideTwo)} from back/top edge</strong></div>
    <p class="map-legend-note">The dotted lines divide the bed depth into approximate thirds. Use the numbered map for relative position and the spacing table below for exact center-to-center plant spacing.</p>
  </aside>`;
}

function renderLayout(inputs, palette){
  const W = 760, H = 370;
  const profile = layoutProfile(inputs);
  const diagramShape = effectiveDiagramShape(inputs, profile);
  const instances = fullPlantInstances(inputs, palette);
  const colors = {yellow:"#d7aa2a", orange:"#d9782f", purple:"#7763a6", lavender:"#9e83b7", gold:"#cf9e20", green:"#7b9b57", white:"#f8f5e9", pink:"#d987a6", blue:"#617eaa", red:"#b8493d", "red-yellow":"#d48a36"};
  const markerSize = instances.length > 34 ? 19 : instances.length > 24 ? 22 : 25;
  const markers = instances.map(i => {
    const fill = colors[i.plant.color] || "#9aaa67";
    return `<g aria-label="${esc(i.number + ': ' + i.plant.common)}"><circle cx="${i.x}" cy="${i.y}" r="${markerSize}" fill="${fill}" stroke="#26331f" stroke-width="2" opacity=".92"></circle><text x="${i.x}" y="${i.y+5}" text-anchor="middle" font-size="${instances.length > 34 ? 10 : 12}" font-weight="900" fill="#141a12">${i.number}</text></g>`;
  }).join("");
  const bedShape = diagramShape === "oval"
    ? `<ellipse cx="380" cy="188" rx="338" ry="148" fill="#fffaf0" stroke="#786b56" stroke-width="3"></ellipse><ellipse cx="380" cy="188" rx="218" ry="80" fill="none" stroke="#d8cdb9" stroke-dasharray="7 7"></ellipse>`
    : diagramShape === "circle"
      ? `<circle cx="380" cy="186" r="150" fill="#fffaf0" stroke="#786b56" stroke-width="3"></circle><circle cx="380" cy="186" r="86" fill="none" stroke="#d8cdb9" stroke-dasharray="7 7"></circle>`
      : diagramShape === "kidney"
        ? `<path d="M126 188 C126 102, 238 52, 372 60 C516 68, 640 132, 652 220 C662 290, 590 330, 496 330 C432 330, 384 304, 346 278 C310 302, 254 324, 204 322 C148 320, 114 282, 120 236 C124 212, 134 202, 154 192 C142 190, 132 188, 126 188 Z" fill="#fffaf0" stroke="#786b56" stroke-width="3"></path><path d="M232 188 C232 138, 296 106, 386 110 C480 114, 562 160, 562 216 C562 258, 518 286, 450 286 C406 286, 374 266, 346 246 C318 264, 280 278, 242 276 C212 274, 194 252, 196 226 C198 206, 208 194, 232 188 Z" fill="none" stroke="#d8cdb9" stroke-dasharray="7 7"></path>`
        : diagramShape === "rectangle"
          ? `<rect x="32" y="46" width="696" height="282" rx="18" fill="#fffaf0" stroke="#786b56" stroke-width="3"></rect><rect x="168" y="104" width="424" height="166" rx="14" fill="none" stroke="#d8cdb9" stroke-dasharray="7 7"></rect>`
          : diagramShape === "corner"
            ? `<path d="M28 32 L504 32 Q548 32 548 76 L548 124 L728 124 L728 334 L28 334 Z" fill="#fffaf0" stroke="#786b56" stroke-width="3"></path><path d="M126 96 L456 96 Q490 96 490 130 L490 186 L632 186 L632 272 L126 272 Z" fill="none" stroke="#d8cdb9" stroke-dasharray="7 7"></path>`
            : diagramShape === "strip"
              ? `<rect x="20" y="58" width="720" height="248" rx="18" fill="#fffaf0" stroke="#786b56" stroke-width="3"></rect>`
              : diagramShape === "cluster"
                ? `<rect x="20" y="42" width="720" height="274" rx="24" fill="#fffaf0" stroke="#786b56" stroke-width="3"></rect><circle cx="144" cy="102" r="42" fill="none" stroke="#d8cdb9" stroke-width="3"></circle><circle cx="610" cy="260" r="50" fill="none" stroke="#d8cdb9" stroke-width="3"></circle>`
                : `<rect x="16" y="16" width="${W-32}" height="${H-32}" rx="24" fill="#fffaf0" stroke="#786b56" stroke-width="3"></rect>`;
  const waterCue = (inputs.condition === "rainGarden" || inputs.condition === "floodEdge" || inputs.layoutType === "rainPocket") ? `<path d="M36 326 C160 288, 250 344, 376 316 S598 280,724 326" fill="none" stroke="#82aeb8" stroke-width="7" opacity=".55"/>` : "";
  const heatCue = (inputs.condition === "urbanHeat" || inputs.condition === "streetHellstrip" || inputs.layoutType === "curbStrip") ? `<rect x="16" y="326" width="728" height="24" rx="10" fill="#e8d2b8" opacity=".8"></rect><text x="34" y="343" font-size="12" font-weight="900" fill="#7a4b2b">pavement / reflected heat edge</text>` : "";
  const dimensionOverlay = mapDimensionOverlay(inputs, profile, W, H);
  const guideOverlay = mapGuideOverlay(inputs, profile, W, H);
  const guideOne = formatFeetInches(Math.round(inputs.depth * 12 / 3));
  const guideTwo = formatFeetInches(Math.round(inputs.depth * 12 * 2 / 3));
  const mapLegend = renderMapScaleLegend(inputs, guideOne, guideTwo);
  return `<div class="info"><strong>Planting area type:</strong> ${esc(layoutTypeLabel(inputs.layoutType))}. <strong>Bed shape:</strong> ${esc(bedShapeLabel(inputs.bedShape))}. <strong>Map dimensions:</strong> ${inputs.length} ft long × ${inputs.depth} ft wide/deep. The numbered map below shows all ${instances.length} plants from the nursery list. Map measurements are listed in the legend so the drawing stays readable.</div>
  <div class="layout-box">
    <div class="map-flex">
      <div class="map-canvas">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Full numbered top-down garden planting map">
          ${bedShape}
          ${waterCue}${heatCue}
          <text x="28" y="48" font-size="13" font-weight="900" fill="#5a4f3e">${esc(profile.upperLabel)}</text>
          <text x="28" y="${H-24}" font-size="13" font-weight="900" fill="#5a4f3e">${esc(profile.lowerLabel)}</text>
          ${dimensionOverlay}
          ${guideOverlay}
          ${markers}
        </svg>
      </div>
      ${mapLegend}
    </div>
  </div>
  ${renderSpecificPlacementTable(inputs, palette, instances)}
  ${renderZoneCards(inputs, palette)}
  <p class="muted">Prototype layout: the numbered markers show placement order and relative position, but they are not a survey-grade drawing. The legend lists the entered bed length, bed width/depth, and dotted guide-line measurements. Use the spacing table above for center-to-center planting distances in inches, then verify mature spread, utilities, paths, irrigation heads, drainage, and exact bed edges on site.</p>`;
}

function renderTimeline(palette){
  return `<div class="timeline">` + months.map(m => {
    const blooming = palette.filter(p=>p.bloom.includes(m)).map(p=>p.common);
    return `<div class="month-row"><div class="month-name">${monthName[m]}</div><div class="month-plants">${blooming.length ? blooming.map(x=>`<span class="chip">${esc(x)}</span>`).join("") : `<span class="muted">Bloom gap</span>`}</div></div>`;
  }).join("") + `</div>`;
}

function modePlantGuidance(p, inputs){
  if(inputs.designMode === "beginner") return p.tidy && !p.aggressive ? "beginner-friendly" : "review before using";
  if(inputs.designMode === "advanced") return p.aggressive || p.tags.includes("vine") || p.height[1] > 96 ? "high value; manage actively" : "advanced-compatible";
  return p.aggressive ? "standard with containment" : "standard-compatible";
}

function renderSeasonalScore(seasonal){
  const cards = [seasonal.spring, seasonal.summer, seasonal.fall].map(s => `<article class="season-card"><h3>${esc(s.label)}</h3><strong>${s.months}/3 months</strong><p>${s.count} selected species bloom in this season.</p><p>${s.plants.length ? s.plants.slice(0,10).map(x=>`<span class="chip">${esc(x)}</span>`).join("") : `<span class="muted">No selected plants</span>`}</p></article>`).join("");
  const interpretation = seasonal.balance >= 90 ? "Strong spring/summer/fall continuity." : seasonal.balance >= 70 ? "Usable continuity with at least one season that could be strengthened." : "Seasonal gap risk; add plants for the weak season before treating this as a final design.";
  return `<div class="season-grid">${cards}</div><div class="info"><strong>Seasonal balance:</strong> ${seasonal.balance}/100. ${esc(interpretation)} Minimum species count in a season: ${seasonal.minimumSeasonSpecies}.</div>`;
}


function effectiveBedArea(inputs){
  const base = Math.max(1, inputs.length * inputs.depth);
  const shape = (inputs.layoutType === "curbStrip") ? "strip" : (inputs.layoutType === "patioCluster") ? "cluster" : (inputs.layoutType === "rainPocket") ? "pocket" : (inputs.bedShape || "oval");
  if(shape === "circle"){
    const d = Math.min(inputs.length, inputs.depth);
    return Math.PI * Math.pow(d/2, 2);
  }
  if(shape === "oval") return base * 0.78;
  if(shape === "kidney") return base * 0.72;
  if(shape === "corner") return base * 0.74;
  if(shape === "cluster") return base * 0.68;
  if(shape === "pocket") return base * 0.78;
  return base;
}

function estimatePerimeter(inputs){
  const L = Math.max(1, inputs.length), D = Math.max(1, inputs.depth);
  const shape = (inputs.layoutType === "curbStrip") ? "strip" : (inputs.layoutType === "patioCluster") ? "cluster" : (inputs.layoutType === "rainPocket") ? "pocket" : (inputs.bedShape || "oval");
  if(shape === "circle"){
    const d = Math.min(L, D);
    return Math.PI * d;
  }
  if(shape === "oval" || shape === "pocket"){
    const a = L/2, b = D/2;
    return Math.PI * (3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)));
  }
  if(shape === "kidney"){
    const a = L/2, b = D/2;
    const oval = Math.PI * (3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)));
    return oval * 1.12;
  }
  if(shape === "corner") return (2*(L+D) + Math.min(L,D)) * 0.85;
  if(shape === "cluster") return 2*(L+D) * 1.18;
  return 2*(L+D);
}

function edgingLength(inputs){
  const full = estimatePerimeter(inputs);
  if(inputs.layoutType === "fenceLine" || inputs.layoutType === "foundation") return inputs.length + (2 * inputs.depth);
  return full;
}

function materialEstimate(inputs){
  const area = effectiveBedArea(inputs);
  const mulchDepth = inputs.mulchDepth || 3;
  const cuFt = area * (mulchDepth / 12);
  const cuYd = cuFt / 27;
  const bags2 = Math.ceil(cuFt / 2);
  const bags3 = Math.ceil(cuFt / 3);
  const perimeter = estimatePerimeter(inputs);
  const edge = edgingLength(inputs);
  const edgeWithWaste = Math.ceil(edge * 1.10);
  const fullWithWaste = Math.ceil(perimeter * 1.10);
  return {area, mulchDepth, cuFt, cuYd, bags2, bags3, perimeter, edge, edgeWithWaste, fullWithWaste};
}

function renderMaterials(inputs){
  const m = materialEstimate(inputs);
  const edgeNote = (inputs.layoutType === "fenceLine" || inputs.layoutType === "foundation")
    ? "Recommended edging assumes the back edge is against a fence, wall, or house and only the front plus side returns need edging. Buy full-perimeter edging if you want the whole outline bordered."
    : "Recommended edging assumes the full visible bed outline gets edged. Curved beds need extra allowance for cuts, overlaps, and layout changes.";
  const fenceNote = (inputs.layoutType === "fenceLine")
    ? `If adding low decorative fencing along the fence planting, start with about ${Math.ceil(inputs.length * 1.10)} linear ft for the main run, then add side returns only if needed.`
    : `If adding low decorative fencing around this bed, start with about ${m.fullWithWaste} linear ft for the full outline.`;
  return `<div class="info"><strong>Materials estimate:</strong> prototype calculation based on entered length/depth, selected bed shape, and mulch depth. Measure the actual bed before buying because curves, corners, and existing hardscape change the final amount.</div>
  <div class="materials-grid">
    <article class="materials-card"><h3>Estimated bed area</h3><strong>${m.area.toFixed(1)} sq ft</strong><p class="muted">Shape-adjusted from ${inputs.length} × ${inputs.depth} ft.</p></article>
    <article class="materials-card"><h3>Mulch volume</h3><strong>${m.cuYd.toFixed(2)} cu yd</strong><p class="muted">${m.cuFt.toFixed(1)} cu ft at ${m.mulchDepth} in. depth.</p></article>
    <article class="materials-card"><h3>Bagged mulch</h3><strong>${m.bags2} bags</strong><p class="muted">Using 2-cu-ft bags. Or ${m.bags3} bags if buying 3-cu-ft bags.</p></article>
    <article class="materials-card"><h3>Edging / fencing</h3><strong>${m.edgeWithWaste} linear ft</strong><p class="muted">Recommended edging length with 10% allowance.</p></article>
  </div>
  <div class="logic-grid">
    ${renderListCard("How the estimate works", [
      `Effective bed area: ${m.area.toFixed(1)} sq ft for ${bedShapeLabel(inputs.bedShape)} / ${layoutTypeLabel(inputs.layoutType)}.`,
      `Mulch volume: area × ${m.mulchDepth} inches ÷ 12 = ${m.cuFt.toFixed(1)} cubic ft.`,
      `Bulk mulch: ${m.cuYd.toFixed(2)} cubic yd. Round up if buying loose bulk mulch.`,
      `Bagged mulch: ${m.bags2} two-cu-ft bags or ${m.bags3} three-cu-ft bags.`
    ], "logic-card good")}
    ${renderListCard("Edging / low fence guidance", [
      `Estimated full perimeter: ${m.perimeter.toFixed(1)} linear ft.`,
      `Recommended edging buy amount: ${m.edgeWithWaste} linear ft after 10% extra.`,
      edgeNote,
      fenceNote
    ])}
    ${renderListCard("Mulch cautions", [
      "Use mulch as a surface layer; do not mix large amounts into the planting holes.",
      "Keep mulch pulled back from perennial crowns, shrub stems, and tree trunks.",
      inputs.zip === "80906" ? "In clay soil, avoid a smooth-sided planting hole; use native backfill so roots can expand beyond the amended pocket." : "In gumbo clay, avoid creating a bathtub planting hole full of loose imported soil.",
      "For direct-seeded pockets or tiny plugs, leave a small open ring so mulch does not bury seedlings."
    ], "logic-card caution")}
  </div>`;
}

function plantType(p){
  if(p.tags.includes("grass") || p.tags.includes("shade grass")) return "grass";
  if(p.tags.includes("shrub")) return "shrub";
  if(p.tags.includes("vine")) return "vine";
  if(p.tags.includes("groundcover") || p.tags.includes("xeric groundcover")) return "groundcover";
  return "perennial";
}

function primaryRoles(p){
  const roles = [];
  ["bees","butterflies","monarchs","hummingbirds","cardinals","biodiversity"].forEach(g => {
    if((p.roles[g] || 0) >= 5) roles.push(g);
  });
  if(p.tags.some(t => t.includes("host"))) roles.push("host");
  return roles;
}

function backupChoices(p, inputs, palette){
  const regionPlants = plants.filter(x => x.location.some(loc => inputs.locations.includes(loc)));
  const selectedIds = new Set(palette.map(x => x.id));
  const pType = plantType(p);
  const pRoles = primaryRoles(p);
  const pAvgH = (p.height[0] + p.height[1]) / 2;

  const ROLE_WEIGHT = { hummingbirds:6, host:5, monarchs:5, cardinals:4, butterflies:2, bees:2, biodiversity:1 };
  const wOf = r => ROLE_WEIGHT[r] || 1;
  const pSignature = pRoles.slice().sort((a, b) => wOf(b) - wOf(a))[0] || null;

  const jaccard = (a, b) => {
    const A = new Set(a), B = new Set(b);
    if(!A.size && !B.size) return 0;
    let inter = 0; A.forEach(v => { if(B.has(v)) inter++; });
    return inter / (A.size + B.size - inter);
  };

  // Plants already in the design are NO LONGER excluded — they are still valid
  // "get this instead" suggestions, and excluding them was throwing out the best
  // matches (the other milkweed, the other hummingbird plants, etc.).
  let pool = regionPlants
    .filter(x => x.id !== p.id)
    .filter(x => x.layer === p.layer)
    .filter(x => plantType(x) === pType)
    .filter(x => !inputs.nativeOnly || x.native)
    .filter(x => !failReasons(x, inputs).length);

  if(pSignature){
    const sig = pool.filter(x => primaryRoles(x).includes(pSignature));
    if(sig.length >= 2) pool = sig;
  }

  const altScore = x => {
    const xRoles = primaryRoles(x);
    let s = 0;
    if(selectedIds.has(x.id)) s -= 8;            // gently prefer alternatives not already in the plan
    if(pSignature && xRoles.includes(pSignature)) s += 15;
    s += jaccard(pRoles, xRoles) * 20;
    s += xRoles.filter(r => pRoles.includes(r)).reduce((a, r) => a + wOf(r), 0);
    s += jaccard(p.moist, x.moist) * 12;
    s += jaccard(p.sun, x.sun) * 6;
    const hDiff = Math.abs((x.height[0] + x.height[1]) / 2 - pAvgH);
    if(hDiff <= 12) s += 4; else if(hDiff <= 24) s += 2; else if(hDiff <= 48) s += 1;
    s += jaccard(p.tags, x.tags) * 4;
    return s;
  };

  return pool
    .map(x => ({...x, altScore: altScore(x)}))
    .sort((a, b) => b.altScore - a.altScore || a.common.localeCompare(b.common))
    .slice(0, 3);
}

function backupText(p, inputs, palette){
  const alts = backupChoices(p, inputs, palette);
  if(!alts.length){
    const type = plantType(p);
    const typeWord = type === "grass" ? "grass" : type === "shrub" ? "shrub" : type === "vine" ? "vine" : type === "groundcover" ? "groundcover" : layerLabel(p.layer).toLowerCase();
    return `Ask your nursery for a locally native ${typeWord} plant with similar sun, moisture, and wildlife role.`;
  }
  const names = alts.map(a => a.common);
  if(names.length === 1) return `If unavailable, ask for: ${names[0]}.`;
  if(names.length === 2) return `If unavailable, ask for: ${names[0]} or ${names[1]}.`;
  return `If unavailable, ask for: ${names[0]}, ${names[1]}, or ${names[2]}.`;
}

function renderShoppingList(palette, inputs){
  const order = ["back","middle","front"];
  const rows = [];
  order.forEach(layer => palette.filter(p=>p.layer===layer).forEach(p=>rows.push(`<tr><td><strong>${esc(layerLabel(layer))}</strong></td><td><strong>${esc(p.common)}</strong>${bearBadge(p, inputs)}<span class="sciname">${esc(p.sci)}</span></td><td>${p.qty}</td><td>${esc(containerSuggestion(p, inputs))}</td><td>${esc(backupText(p, inputs, palette))}</td><td>${esc(shoppingNote(p, inputs))}</td></tr>`)));
  const hasBear = inputs.zip === "80906" && palette.some(p => p.bear);
  const bearLegend = hasBear ? `<p class="bear-legend"><span aria-hidden="true">🐻</span> = bear attractant — see the <strong>Bear activity</strong> setting in Garden inputs.</p>` : "";
  return `<table><thead><tr><th>Layer</th><th>Plant</th><th>Qty</th><th>Ask nursery for</th><th>Backup choice</th><th>Buying note</th></tr></thead><tbody>${rows.join("")}</tbody></table><p class="shop-note">Nursery list is grouped by design layer. Backup choices are rule-based alternates that pass the current site filters when possible. Verify local availability, container size, straight species vs. cultivar behavior, and mature size before purchase.</p>${bearLegend}`;
}

function containerSuggestion(p, inputs){
  if(inputs.condition === "patioContainer") return p.layer === "back" ? "3–5 gal or large container specimen" : "1 gal or 4-inch plugs";
  if(p.tags.includes("shrub") || p.tags.includes("vine") || p.height[1] > 72) return "1–3 gal native plant";
  if(p.layer === "front" || p.spread[1] <= 24) return "4-inch plugs or 1 gal";
  return "1 gal native perennial";
}

function shoppingNote(p, inputs){
  const notes = [];
  if(p.aggressive) notes.push("buy fewer; spreads");
  if(p.pet) notes.push("toxicity review");
  if(p.tags.includes("vine")) notes.push("needs trellis/fence");
  if(p.moist.includes("wet") && inputs.moisture !== "wet") notes.push("place in wettest pocket");
  if(!notes.length) notes.push("repeat in drifts");
  return notes.join("; ");
}

function failReasons(p, inputs){
  const reasons = [];
  if(!p.sun.includes(inputs.sun)) reasons.push(`sun mismatch: needs ${p.sun.map(siteLabel).join("/")}`);
  if(!p.moist.includes(inputs.moisture)) reasons.push(`moisture mismatch: prefers ${p.moist.map(moistureLabel).join("/")}`);
  if(inputs.soil !== "unknown" && !p.soil.includes(inputs.soil) && !p.soil.includes("unknown")) reasons.push(`soil mismatch for ${soilLabel(inputs.soil, inputs.zip)}`);
  if(!conditionMatches(p, inputs, true)) reasons.push(`micro-site mismatch for ${conditionLabel(inputs.condition)}`);
  if(inputs.petSafe && p.pet) reasons.push("removed by pet-toxicity review constraint");
  if(inputs.deer && !p.deer) reasons.push("removed by deer-pressure constraint");
  if(inputs.squirrelAware && p.squirrel >= 4 && !hasGoal(inputs, "cardinals")) reasons.push("removed by squirrel-aware constraint");
  if(inputs.designMode === "beginner" && (p.aggressive || p.pet || p.height[1] > 96 || p.tags.includes("vine"))) reasons.push("removed by beginner mode");
  if(inputs.hoa && isFrontYardStyle(inputs.style) && !p.tidy && p.aggressive && inputs.designMode !== "advanced") reasons.push("removed by front-yard/HOA constraint");
  const area = inputs.length * inputs.depth;
  if(area < 70 && p.spread[1] > 60) reasons.push("too wide for this bed size");
  if(area < 55 && p.height[1] > 72) reasons.push("too tall for this small bed");
  return unique(reasons);
}

function similarRole(a,b, inputs){
  if(a.layer === b.layer) return true;
  const goal = hasGoal(inputs, "biodiversity") ? "biodiversity" : inputs.goal;
  if((a.roles[goal] || 0) >= 7 && (b.roles[goal] || 0) >= 7) return true;
  return a.tags.some(t=>b.tags.includes(t));
}

function substitutionSuggestions(inputs, palette){
  const regionPlants = plants.filter(p => p.location.some(loc => inputs.locations.includes(loc)));
  const selectedIds = new Set(palette.map(p=>p.id));
  const selected = palette.slice();
  const wanted = regionPlants.map(p=>({...p, wantScore:scorePlant(p, {...inputs, designMode:"advanced", petSafe:false, deer:false, squirrelAware:false, hoa:false})}))
    .filter(p=>!selectedIds.has(p.id))
    .sort((a,b)=>b.wantScore-a.wantScore)
    .slice(0,24);
  const suggestions = [];
  for(const p of wanted){
    const reasons = failReasons(p, inputs);
    if(!reasons.length) continue;
    const substitute = selected.find(s=>s.layer===p.layer) || selected.find(s=>s.tags.some(t=>p.tags.includes(t))) || null;
    if(substitute) suggestions.push({excluded:p, substitute, reasons});
    if(suggestions.length >= 6) break;
  }
  return suggestions;
}

function renderSubstitutions(inputs, palette){
  const suggestions = substitutionSuggestions(inputs, palette);
  if(!suggestions.length) return `<div class="status">No major substitutions were needed. The selected palette already fits the current site filters and design mode.</div>`;
  return suggestions.map(s=>`<article class="sub-card"><h3>${esc(s.excluded.common)} <span class="sub-arrow">→</span> ${esc(s.substitute.common)}</h3><p><strong>Why excluded:</strong> ${s.reasons.map(r=>`<span class="chip red">${esc(r)}</span>`).join("")}</p><p><strong>Use instead:</strong> ${esc(s.substitute.common)} keeps a similar layer, habitat role, or goal boost while fitting the active constraints.</p></article>`).join("") + `<p class="muted">Substitution logic is rule-based. Production should expose user-approved swaps and source-validated alternates by ecoregion and nursery availability.</p>`;
}

function riskFindings(inputs, palette){
  const risks = [];
  const aggressive = palette.filter(p=>p.aggressive).map(p=>p.common);
  const pet = palette.filter(p=>p.pet).map(p=>p.common);
  const wetMismatch = palette.filter(p=>p.moist.includes("wet") && inputs.moisture !== "wet" && !["rainGarden","floodEdge","heavyClay","gumboClay"].includes(inputs.condition)).map(p=>p.common);
  const dryMismatch = palette.filter(p=>p.moist.includes("dry") && inputs.moisture === "wet" && !p.moist.includes("wet")).map(p=>p.common);
  const big = palette.filter(p=>p.height[1] > 96 || p.spread[1] > 72 || p.tags.includes("vine")).map(p=>p.common);
  const hoaRisk = palette.filter(p=>inputs.hoa && (!p.tidy || p.aggressive || p.height[1] > 72)).map(p=>p.common);
  const pathRisk = palette.filter(p=>p.layer === "front" && (p.spread[1] > 30 || p.aggressive)).map(p=>p.common);
  const squirrelRisk = palette.filter(p=>inputs.squirrelAware && p.squirrel >= 3).map(p=>p.common);
  if(aggressive.length) risks.push(["Aggressive spreaders", aggressive, "Use edging, fewer plants, or swap them out for tighter beds."]);
  if(pet.length) risks.push(["Pet/child toxicity review", pet, "Do not place these where pets or children browse until verified."]);
  if(wetMismatch.length) risks.push(["Drainage placement", wetMismatch, "Use in the lowest pocket or change moisture input to wet only if that is real."]);
  if(dryMismatch.length) risks.push(["Wet-site mismatch", dryMismatch, "These are better on berms, edges, or better-drained pockets."]);
  if(big.length) risks.push(["Large plant / support needed", big, "Assign shrubs and vines to back edges, fences, trellises, or larger beds."]);
  if(hoaRisk.length) risks.push(["HOA / front-yard visibility", hoaRisk, "Keep these as back anchors, reduce quantity, or substitute tidier plants."]);
  if(pathRisk.length) risks.push(["Path/access conflict", pathRisk, "Front-edge spreaders can creep into walks; keep a mulch/access strip."]);
  if(squirrelRisk.length) risks.push(["Squirrel-aware tradeoff", squirrelRisk, "Bird habitat shares berries, fruit, seed heads, and cover with other wildlife."]);
  if(inputs.mosquitoAware) risks.push(["Mosquito-aware limitation", palette.filter(p=>p.tags.includes("aromatic edge") || p.tags.includes("mint family")).map(p=>p.common), "Aromatic plants are a comfort-edge design cue only; passive planting is not reliable mosquito control. Remove standing water and use proven bite-prevention practices."]);
  if(inputs.snakeAware){
    if(snakeCandidates.length) risks.push(["Snake-aware open-base candidates", snakeCandidates, "Use these as visible, open-base or edge plants; keep the base clear rather than creating a dense thicket.", true]);
    if(snakeDenseRisk.length) risks.push(["Snake hiding-cover caution", snakeDenseRisk, "Avoid dense low growth beside doors, paths, seating, and house foundations; thin or substitute if visibility is poor."]);
    risks.push(["Snake-aware limitation", ["habitat management", "rodent reduction", "open visibility"], "Plants alone are not reliable snake deterrents. The useful design move is less hiding cover and fewer food/rodent attractors."]);
  }
  if(inputs.bearMode !== "ignore"){
    const bearPlants = palette.filter(p => p.bear).map(p => p.common);
    if(inputs.bearMode === "reduce"){
      if(bearPlants.length) risks.push(["Bear attractants down-ranked", bearPlants, "These berry/fruit plants were heavily down-ranked. If they still appear, it is because bird-habitat or site constraints left no suitable substitute. Consider removing or relocating them away from the house."]);
      risks.push(["Bear-attract limitation", ["no repellent plants exist", "remove food sources", "secure trash and bird feeders"], "No plant species reliably repels bears. The practical approach is to minimize high-calorie food sources near entry points, secure all food waste, and remove bird feeders when bears are active (April–November in Colorado)."]);
    }
    if(inputs.bearMode === "attract"){
      if(bearPlants.length) risks.push(["Bear attractant plants in palette", bearPlants, "These fruit/berry plants were prioritized. Bears that associate residential areas with food are frequently euthanized by wildlife agencies.", false]);
      risks.push(["Bear safety — agency guidance", ["Colorado Parks and Wildlife", "local ordinances", "human safety"], "CPW strongly discourages intentionally attracting bears to homes. It may violate local wildlife ordinances and puts both residents and bears at risk. Consider native bear habitat restoration away from structures instead."]);
    }
  }
  if(inputs.condition === "postFreeze") risks.push(["Post-freeze recovery", palette.map(p=>p.common).slice(0,6), "Favor root-hardy structure, avoid relying on a single woody focal point, and plan for visible winter cutback."]);
  if(!risks.length) risks.push(["No major V3.0 Static risk flags", ["Selected palette"], "The current run avoided the main prototype risk categories.", true]);
  return risks;
}

function renderRiskPanel(inputs, palette, extraWarnings=[]){
  const extra = extraWarnings && extraWarnings.length ? `<div class="tab-note-card"><h3>Run-specific notes moved from the top of the page</h3><ul class="logic-list">${extraWarnings.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>` : `<div class="status">No pet-toxicity, aggressive-spread, squirrel, snake, or special run warnings were flagged for this generated palette.</div>`;
  const mosquito = inputs.mosquitoAware ? `<div class="tab-note-card"><h3>Mosquito-aware note</h3><p>This adds aromatic, pollinator-compatible edge plants near seating areas. It does not claim passive plants control mosquitoes; remove standing water and use proven bite-prevention practices.</p></div>` : "";
  const snake = inputs.snakeAware ? `<div class="tab-note-card"><h3>Snake-aware note</h3><p>This favors open-base structure and reduces dense low cover. It does not prove or promise that plants repel snakes; reduce clutter, rodents, and hidden damp cover as the primary prevention strategy.</p></div>` : "";
  const bear = (inputs.bearMode === "reduce") ? `<div class="tab-note-card"><h3>Reduce bear attraction — note</h3><p>Berry and fruit plants have been heavily down-ranked. No plant species repels bears. The practical strategy is to minimize high-calorie food sources near the home, secure trash and bird feeders, and follow <a href="https://cpw.state.co.us/learn/Pages/LivingwithWildlife-Bears.aspx" target="_blank" rel="noopener">Colorado Parks and Wildlife bear-smart guidelines</a>.</p></div>` : (inputs.bearMode === "attract") ? `<div class="tab-note-card" style="border-left:4px solid #e6a817"><h3>Attract bears — safety warning</h3><p><strong>Colorado Parks and Wildlife strongly discourages intentionally attracting black bears to residential yards.</strong> Bears that associate homes with food are frequently euthanized. This may violate local ordinances. This mode is provided for informational use only.</p></div>` : "";
  return extra + mosquito + snake + bear + `<div class="risk-list">` + riskFindings(inputs, palette).map(([title,items,note,good])=>`<div class="risk-item ${good ? "good" : ""}"><h3>${esc(title)}</h3><p>${items.slice(0,10).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</p><p>${esc(note)}</p></div>`).join("") + `</div>`;
}

function renderWhy(inputs, palette, score, region){
  const hostPlants = palette.filter(p=>p.tags.includes("monarch host")).map(p=>p.common);
  const lateNectar = palette.filter(p=>p.tags.includes("late nectar") || p.tags.includes("fall bloom") || p.tags.includes("monarch nectar")).map(p=>p.common);
  const hummingbird = palette.filter(p=>p.roles.hummingbirds >= 8 || p.tags.includes("hummingbirds")).map(p=>p.common);
  const birds = palette.filter(p=>p.roles.cardinals >= 6 || p.tags.includes("berries") || p.tags.includes("seed heads") || p.tags.includes("cover")).map(p=>p.common);
  const filtered = [];
  filtered.push(`ZIP ${inputs.zip} read as ${region.name}; using the ${region.shortName || region.name} native plant set.`);
  filtered.push(`Selected habitat goals: ${goalListText(inputs)}.`);
  filtered.push(`Site filters required ${siteLabel(inputs.sun)}, ${moistureLabel(inputs.moisture)} moisture, ${soilLabel(inputs.soil, inputs.zip)}, and ${conditionLabel(inputs.condition)} compatibility.`);
  filtered.push(`Planting layout type was set to ${layoutTypeLabel(inputs.layoutType)}, so placement language and layout zones do not assume a fence unless fence-line planting is selected. Style intent was set to ${styleLabel(inputs.style).toLowerCase()}, which changes plant preference and curb-appeal/wildlife tradeoffs.`);
  filtered.push(`${designModeSettings(inputs.designMode).label} mode changed species count, quantity estimates, and risk tolerance: ${designModeSettings(inputs.designMode).description}`);
  if(inputs.nativeOnly) filtered.push("Native-only mode removed non-native options from the prototype set.");
  if(inputs.petSafe) filtered.push("Pet-safe review mode removed plants flagged for toxicity review.");
  if(inputs.deer) filtered.push("Deer pressure required plants flagged as deer-resistant in this starter dataset.");
  if(inputs.hoa) filtered.push("Tidy/front-yard mode favored compact, legible plants and suppressed aggressive spreaders.");
  if(inputs.squirrelAware) filtered.push("Squirrel-aware mode reduced high fruit/berry attractors except where bird habitat requires shared resources.");
  else filtered.push("Squirrel handling was set to ignore, so fruit/berry/shared wildlife resources were not suppressed.");
  if(inputs.mosquitoAware) filtered.push("Mosquito-aware add-on boosted aromatic edge plants but did not score them as mosquito control.");
  if(inputs.snakeAware) filtered.push("Snake-aware mode favored open-base, spiky-edge, or aromatic-edge candidates and suppressed dense low hiding cover; it does not claim plants repel snakes.");
  if(inputs.bearMode === "reduce") filtered.push("Reduce bear attraction mode applied a heavy score penalty to berry/fruit plants tagged as black bear attractants per CPW guidance; no plant repels bears.");
  if(inputs.bearMode === "attract") filtered.push("Attract bears mode boosted berry/fruit bear-attractant plants. Colorado Parks and Wildlife discourages intentionally attracting bears to residential yards.");
  const boosts = [];
  boosts.push(["Seasonal coverage", [`Spring ${score.seasonal.spring.months}/3 months`, `Summer ${score.seasonal.summer.months}/3 months`, `Fall ${score.seasonal.fall.months}/3 months`]]);
  if(hostPlants.length) boosts.push(["Monarch host support", hostPlants]);
  if(lateNectar.length) boosts.push(["Late nectar continuity", lateNectar]);
  if(hummingbird.length) boosts.push(["Hummingbird nectar", hummingbird]);
  if(birds.length) boosts.push(["Songbird/cardinal structure", birds]);
  boosts.push(["Layer balance", palette.map(p=>`${p.common} (${layerLabel(p.layer)})`)]);
  const cautions = [];
  const aggressive = palette.filter(p=>p.aggressive).map(p=>p.common);
  const pet = palette.filter(p=>p.pet).map(p=>p.common);
  const squirrel = palette.filter(p=>p.squirrel >= 3).map(p=>p.common);
  if(aggressive.length) cautions.push(["Spread management", aggressive, "Use edging, pruning, or smaller quantities where a tidy look matters."]);
  if(pet.length) cautions.push(["Toxicity review", pet, "Confirm plant risk before placing where pets or children browse."]);
  if(squirrel.length && inputs.squirrelAware) cautions.push(["Squirrel tradeoff", squirrel, "Bird-supporting berries, fruit, and cover cannot fully exclude squirrels."]);
  if(!cautions.length) cautions.push(["No major prototype cautions", ["Selected palette"], "No aggressive, toxicity-review, or high squirrel-attractor flags dominated this run."]);
  const biodiversityNote = hasGoal(inputs, "biodiversity") ? `<div class="tab-note-card"><h3>Maximum biodiversity mode</h3><p>This mode balances nectar, pollen, monarch host plants, fall migration nectar, hummingbird flowers, songbird seed/berry value, layered structure, and overwintering habitat.</p></div>` : "";
  return biodiversityNote + `<div class="logic-grid">
    <article class="logic-card good"><h3>Filters applied</h3><ul class="logic-list">${filtered.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></article>
    <article class="logic-card good"><h3>Goal boosts</h3>${boosts.map(([label,items])=>`<p><strong>${esc(label)}:</strong> ${items.slice(0,8).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</p>`).join("")}</article>
    <article class="logic-card"><h3>Score interpretation</h3><p>This run scored <strong>${score.total}/100</strong>. The score rewards bloom continuity, native density, host plants, wildlife support, layered structure, and micro-site fit. It is a prototype planning score, not a survival guarantee.</p></article>
    <article class="logic-card caution"><h3>Tradeoffs to review</h3>${cautions.map(([label,items,note])=>`<p><strong>${esc(label)}:</strong> ${items.slice(0,8).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}<br><span class="muted">${esc(note)}</span></p>`).join("")}</article>
  </div>`;
}

function scoreRowDetails(score, inputs){
  return [
    {
      label:"Bloom continuity", val:score.bloomContinuity, max:25,
      meaning:`Measures whether the selected plants provide flowers across a long part of the ${inputs.zip === "80906" ? "Front Range" : "Houston"} growing season.`,
      improve:"Add or substitute plants that bloom in the weakest visible season, especially late summer/fall if the fall score is low."
    },
    {
      label:"Native density", val:score.nativeDensity, max:20,
      meaning:"Measures how much of the palette is native or locally appropriate in this prototype dataset.",
      improve:"Keep Native-only on, or replace non-native or companion plants with source-verified local natives."
    },
    {
      label:"Host plant support", val:score.hostSupport, max:20,
      meaning:"Host plants are the plants caterpillars eat. For example, monarch caterpillars need milkweed; Gulf fritillaries use passionflower. Nectar plants feed adult butterflies, but host plants let them reproduce.",
      improve:"Add a host plant that fits the site, such as an appropriate milkweed for monarch goals or passionflower where a vine/support makes sense."
    },
    {
      label:"Pollinator / wildlife support", val:score.pollinatorSupport, max:15,
      meaning:"Combines bee, butterfly, hummingbird, monarch, and songbird/cardinal value based on the selected habitat goals.",
      improve:"Select additional habitat goals or add plants with stronger nectar, pollen, seed-head, berry, or shelter value."
    },
    {
      label:"Layered structure", val:score.structureScore, max:10,
      meaning:"Checks whether the design has more than one planting layer, such as low edge plants, mid-height flowers, and taller structure.",
      improve:"Add at least one structural grass, shrub, vine/support plant, or taller perennial if the bed has only low/mid plants."
    },
    {
      label:"Micro-site fit", val:score.siteFit, max:10,
      meaning:"Measures whether the selected plants match the sun, moisture, soil, and regional micro-site condition.",
      improve:"Change the site inputs to match the real bed, or use substitutions that better fit the selected condition."
    },
    {
      label:"Seasonal balance bonus", val:score.seasonalBalance, max:10,
      meaning:"Rewards a more even spread of spring, summer, and fall bloom rather than loading all flowers into one season.",
      improve:"Open the Seasonal score tab, find the weakest season, and add one or two plants that bloom during that season."
    }
  ];
}

function renderScore(score, inputs, palette){
  const deg = Math.round(score.total/100*360);
  const rows = scoreRowDetails(score, inputs);
  const detailCards = rows.map(r=>`<article class="logic-card"><h3>${esc(r.label)}</h3><p><strong>Score:</strong> ${r.val}/${r.max}</p><p><strong>What it means:</strong> ${esc(r.meaning)}</p><p><strong>How to improve:</strong> ${esc(r.improve)}</p></article>`).join("");
  const weak = rows.filter(r => r.val / r.max < .65).map(r=>r.label);
  return `<div class="score-wrap">
    <div class="score-circle" style="--deg:${deg}deg"><div class="score-num">${score.total}</div></div>
    <div class="bars">${rows.map(r=>`<div><div class="bar-label"><span>${esc(r.label)}</span><span>${r.val}/${r.max}</span></div><div class="bar"><span style="width:${Math.round(r.val/r.max*100)}%"></span></div></div>`).join("")}</div>
  </div>
  <div class="info"><strong>How to read this score:</strong> it is a prototype design-quality score, not a certification. It checks habitat coverage, native density, host plants, layer structure, seasonal balance, and site fit. ${weak.length ? `Lowest areas to review: ${esc(weak.join(", "))}.` : "No major weak score component was flagged."}</div>
  <div class="logic-grid">${detailCards}</div>`;
}

function renderRegionNotes(inputs, palette, region){
  const late = palette.filter(p=>p.bloom.some(m=>m>=9)).length;
  const wet = palette.filter(p=>p.moist.includes("wet")).length;
  const woody = palette.filter(p=>p.tags.includes("shrub") || p.tags.includes("vine") || p.tags.includes("evergreen cover")).length;
  return `<div class="tab-note-card"><h3>Region read</h3><p><strong>${esc(region.note)}</strong> Micro-site condition: ${esc(conditionLabel(inputs.condition))}. Planting area type: ${esc(layoutTypeLabel(inputs.layoutType))}. Design mode: ${esc(designModeSettings(inputs.designMode).label)} — ${esc(designModeSettings(inputs.designMode).description)}</p></div><div class="mini-grid">
    <div class="metric"><strong>${esc(region.name)}</strong><span class="muted">ZIP inference</span></div>
    <div class="metric"><strong>${late}</strong><span class="muted">species with Sep–Nov bloom</span></div>
    <div class="metric"><strong>${wet}</strong><span class="muted">species tolerant of wet/average sites</span></div>
  </div>
  <p><strong>Design logic in V4.0:</strong> prioritize locally sourced natives, layered habitat, long bloom continuity, seasonal spring/summer/fall balance, micro-site condition matching, regional nectar continuity, and bird-supporting structure without turning the app into a tracker, journal, or recurring planner.</p>
  <p><strong>Multi-goal behavior:</strong> checkbox goals are combined. Bees + butterflies, for example, boosts both high pollen/nectar plants and butterfly nectar/host plants rather than forcing one primary goal.</p>
  <p><strong>Squirrel-aware behavior:</strong> squirrel-aware mode suppresses the highest berry/fruit wildlife plants unless the user explicitly selects cardinals/songbirds. It does not promise squirrel exclusion.</p>
  <p><strong>Mosquito-aware behavior:</strong> the add-on places aromatic, pollinator-compatible plants near patios or edges for human comfort. It does not claim that plants growing in the bed will materially reduce mosquito bites.</p>
  <p><strong>Snake-aware behavior:</strong> the selector favors open-base plants, visible edges, and optional spiky/aromatic companion candidates while avoiding dense low hiding cover. It does not claim that any plant will snake-proof a yard.</p>
  <p><strong>Woody/vine count:</strong> ${woody} selected species are shrubs, vines, or evergreen/cover structure. This helps birds but should be scaled carefully in small beds.</p>
  <h3>Validation sources to keep attached to this prototype</h3>
  <div class="source-list">
    ${(region.locations && region.locations[0] === "80906") ? `
    <a href="https://conps.org/" target="_blank" rel="noopener">Colorado Native Plant Society — statewide native plant resources</a>
    <a href="https://plantselect.org/" target="_blank" rel="noopener">Plant Select — vetted plants for Colorado and the Intermountain West</a>
    <a href="https://extension.colostate.edu/topic-areas/yard-garden/" target="_blank" rel="noopener">CSU Extension — Front Range yard and garden guidance</a>
    <a href="https://www.botanicgardens.org/" target="_blank" rel="noopener">Denver Botanic Gardens — Colorado native plant resources and trials</a>
    <a href="https://www.wildflower.org/collections/" target="_blank" rel="noopener">Lady Bird Johnson Wildflower Center — native plant database including Colorado</a>
    <a href="https://xerces.org/pollinator-conservation/pollinator-friendly-plant-lists" target="_blank" rel="noopener">Xerces Society — pollinator-friendly native plant lists by region</a>
    <a href="https://hgic.clemson.edu/can-plants-repel-problematic-insects/" target="_blank" rel="noopener">Clemson HGIC — limits of mosquito-repellent plant claims</a>
    <a href="https://extension.usu.edu/news_sections/gardening/12-ways-to-stop-snakes-from-slithering-into-yards" target="_blank" rel="noopener">Utah State University Extension — reduce hiding cover near foundations</a>
    <a href="https://hgic.clemson.edu/factsheet/planting-shrubs-correctly/" target="_blank" rel="noopener">Clemson HGIC — shrub planting and first-year root-ball watering</a>
    ` : `
    <a href="https://houstonaudubon.org/conservation/bfc/nativeplants/basics.html" target="_blank" rel="noopener">Houston Audubon — native plant basics and layered bird habitat</a>
    <a href="https://houstonaudubon.org/conservation/bfc/nativeplants/bestplants.html" target="_blank" rel="noopener">Houston Audubon — best plants for a bird-friendly landscape</a>
    <a href="https://houstonaudubon.org/programs/learn/hummingbirds.html" target="_blank" rel="noopener">Houston Audubon — hummingbirds of Houston</a>
    <a href="https://tpwd.texas.gov/huntwild/wild/wildlife_diversity/texas_nature_trackers/monarch/" target="_blank" rel="noopener">Texas Parks & Wildlife — monarch migration through Texas</a>
    <a href="https://www.npsot.org/chapters/houston/native-plant-info/native-plant-guide/" target="_blank" rel="noopener">Native Plant Society of Texas, Houston Chapter — native plant guide</a>
    <a href="https://www.wildflower.org/collections/" target="_blank" rel="noopener">Lady Bird Johnson Wildflower Center — native plant lists and database</a>
    <a href="https://xerces.org/pollinator-conservation/pollinator-friendly-plant-lists" target="_blank" rel="noopener">Xerces Society — pollinator-friendly native plant lists</a>
    <a href="https://hgic.clemson.edu/can-plants-repel-problematic-insects/" target="_blank" rel="noopener">Clemson HGIC — limits of mosquito-repellent plant claims</a>
    <a href="https://agrilifetoday.tamu.edu/2023/04/20/snakes-are-out/" target="_blank" rel="noopener">Texas A&M AgriLife — snakes, food sources, and yard safety</a>
    <a href="https://extension.usu.edu/news_sections/gardening/12-ways-to-stop-snakes-from-slithering-into-yards" target="_blank" rel="noopener">Utah State University Extension — trim shrubs and reduce hiding cover</a>
    <a href="https://stories.tamu.edu/news/2024/05/22/mosquito-season-is-here/" target="_blank" rel="noopener">Texas A&amp;M AgriLife — mosquito prevention basics</a>
    <a href="https://aggie-horticulture.tamu.edu/earthkind/landscape/planting-a-tree/" target="_blank" rel="noopener">Texas A&amp;M Aggie Horticulture — planting hole width and depth guidance</a>
    <a href="https://hgic.clemson.edu/factsheet/planting-shrubs-correctly/" target="_blank" rel="noopener">Clemson HGIC — shrub planting and first-year root-ball watering</a>
    <a href="https://gardeningsolutions.ifas.ufl.edu/care/planting/planting-shrubs/" target="_blank" rel="noopener">UF/IFAS Gardening Solutions — establishing shrubs after planting</a>
    `}
  </div>`;
}

function promptText(inputs, palette, region){
  const front = palette.filter(p=>p.layer==="front").map(p=>p.common).join(", ");
  const mid = palette.filter(p=>p.layer==="middle").map(p=>p.common).join(", ");
  const back = palette.filter(p=>p.layer==="back").map(p=>p.common).join(", ");
  const season = palette.some(p=>p.bloom.includes(10) || p.bloom.includes(11)) ? "early fall, with late-season nectar still in bloom" : "late spring to early summer peak bloom";
  const wildlife = wildlifePhrase(inputs);
  const extras = goalExtraPhrase(inputs);
  const isCoSprings = region.locations && region.locations[0] === "80906";
  const regionDesc = isCoSprings
    ? "Colorado Springs / Front Range residential setting, semi-arid, rocky mountain foothills backdrop optional, clear dry-sky light"
    : "Houston residential neighborhood, warm humid Gulf Coast light, brick or bungalow context optional";
  const midDefault = isCoSprings ? "native Front Range perennials" : "flowering native Gulf Coast perennials";
  const densityNote = isCoSprings ? "realistic Front Range dry-garden density" : "realistic Gulf Coast density";
  const negativeNote = isCoSprings
    ? "No tropical plants, no lush humid jungle planting, no bird feeders, no cartoon style, no impossible plant scale, no invasive nursery exotics as focal plants."
    : "No Midwest prairie backdrop, no desert cactus garden, no tropical resort planting, no bird feeders, no cartoon style, no impossible plant scale, no invasive nursery exotics as focal plants.";
  const layout = layoutProfile(inputs);
  return `PHOTO PROMPT
Realistic mature garden photograph, eye-level 35mm lens, ${season}. A ${inputs.length} by ${inputs.depth} foot ${styleLabel(inputs.style).toLowerCase()} ${region.shortName || region.name} ${layoutTypeLabel(inputs.layoutType)} in ${siteLabel(inputs.sun)}. ${regionDesc}. Naturalistic but intentional; not overgrown, not a fantasy illustration.

SITE AND DESIGN
Region: ${region.name}. Micro-site: ${conditionLabel(inputs.condition)}. Planting layout type: ${layoutTypeLabel(inputs.layoutType)}. Layout cue: ${layout.upperLabel}; ${layout.lowerLabel}. Soil: ${soilLabel(inputs.soil, inputs.zip)}. Moisture: ${moistureLabel(inputs.moisture)}. Design goals: ${goalListText(inputs)}. Design mode: ${designModeSettings(inputs.designMode).label}. ${extras}.

PLANTING STRUCTURE
Back layer: ${back || "compact native shrubs, grasses, and vines"}.
Middle layer: ${mid || midDefault}.
Front layer: ${front || "low native edging plants and groundcovers"}.

WILDLIFE AND DETAILS
Include ${wildlife}. Show layered heights, repeated plant drifts, visible mulch/access edge, healthy foliage, ${densityNote}, and clear front-to-back structure.

NEGATIVE PROMPT
${negativeNote}`;
}

function uploadedPhotoPromptText(inputs, palette, region){
  const standalone = promptText(inputs, palette, region);
  const layout = layoutProfile(inputs);
  const plantNames = palette.map(p=>`${p.common} (${p.qty})`).join(", ");
  return `UPLOADED-PHOTO EDIT PROMPT
Upload the actual garden, yard, patio, fence-line, or planting-bed photo first. Use that uploaded photo as the base image. Do not invent a different house or yard.

EDIT INSTRUCTIONS
Apply this Pollinator Studio planting concept inside the visible planting area only. Preserve the original camera angle, house, fence, driveway, sidewalk, patio, existing trees, doors, windows, roofline, utility boxes, hardscape, lawn edges, shadows, and overall scale. Keep the result realistic for a ${region.shortName || region.name} residential landscape.

BED AND LAYOUT
Bed size: ${inputs.length} by ${inputs.depth} ft. Bed shape: ${bedShapeLabel(inputs.bedShape)}. Planting area type: ${layoutTypeLabel(inputs.layoutType)}. Use the map concept as a guide: ${layout.upperLabel}; ${layout.lowerLabel}. Region: ${region.name}. Sun: ${siteLabel(inputs.sun)}. Soil: ${soilLabel(inputs.soil, inputs.zip)}. Moisture: ${moistureLabel(inputs.moisture)}. Micro-site: ${conditionLabel(inputs.condition)}.

PLANTS TO REPRESENT
Show realistic groupings of: ${plantNames || `${region.shortName || region.name} native pollinator plants`}.

DESIGN GOALS
${goalListText(inputs)}. Make the planting look intentional, layered, and maintainable. Keep plant sizes believable and keep access edges clear.

DO NOT CHANGE
Do not replace the house, fence, paths, driveway, patio, trees, roofline, windows, utilities, or camera perspective. Do not add unrelated decorations, bird feeders, fountains, fantasy lighting, tropical resort plants, or plants outside the proposed bed.

REFERENCE STANDALONE PROMPT DETAILS
${standalone}`;
}

function renderPrompt(inputs, palette, region){
  const standalonePrompt = promptText(inputs, palette, region);
  const photoPrompt = uploadedPhotoPromptText(inputs, palette, region);
  return `<div class="info"><strong>Use with a real garden photo:</strong> upload the actual yard or bed photo first, then copy the <strong>Uploaded-photo edit prompt</strong> below. Use the standalone prompt only when you want a new concept image without a real photo.</div>
  <div class="prompt-actions no-print"><button type="button" class="secondary" onclick="PS.copyUploadedPhotoPrompt()">Copy uploaded-photo edit prompt</button><button type="button" class="secondary" onclick="PS.copyPrompt()">Copy standalone image prompt</button><span id="copyStatus" class="copy-status" aria-live="polite"></span></div>
  <div class="prompt-label">Uploaded-photo edit prompt</div><div id="uploadedPhotoPromptText" class="prompt-content">${esc(photoPrompt)}</div>
  <div class="prompt-label">Standalone image prompt</div><div id="visualPromptText" class="prompt-content">${esc(standalonePrompt)}</div>`;
}

function renderSummary(inputs, palette, score, region, title, totalPlants){
  const topPlants = palette.slice(0,8);
  const zones = gardenZones(inputs, palette).slice(0,6);
  const nursery = palette.slice().sort((a,b)=>({back:0,middle:1,front:2}[a.layer]-({back:0,middle:1,front:2}[b.layer])));
  const plantRows = topPlants.map(p=>`<tr><td><strong>${esc(p.common)}</strong><br><span class="sciname">${esc(p.sci)}</span><br><span class="muted">${esc(dataConfidence(p).overall)}</span></td><td>${p.qty}</td><td>${esc(layerLabel(p.layer))}</td><td>${esc(bloomWindow(p))}</td></tr>`).join("");
  const nurseryRows = nursery.map(p=>`<tr><td>${esc(p.common)}</td><td>${p.qty}</td><td>${esc(containerSuggestion(p, inputs))}</td></tr>`).join("");
  return `<div class="summary-sheet">
    <div class="summary-head"><p class="eyebrow">Printable design sheet</p><h2>${esc(title)}</h2><p>A ${inputs.length} × ${inputs.depth} ft ${esc(layoutTypeLabel(inputs.layoutType))} in ${siteLabel(inputs.sun)} for ${esc(region.name)}. Goals: <strong>${esc(goalListText(inputs))}</strong>. Score: <strong>${score.total}/100</strong>. Approx. plants: <strong>${totalPlants}</strong>.</p></div>
    <div class="summary-grid">
      <section class="summary-section"><h3>Site inputs</h3><ul><li>ZIP: ${esc(inputs.zip)}</li><li>Sun: ${esc(siteLabel(inputs.sun))}</li><li>Moisture: ${esc(moistureLabel(inputs.moisture))}</li><li>Soil: ${esc(soilLabel(inputs.soil, inputs.zip))}</li><li>Micro-site: ${esc(conditionLabel(inputs.condition))}</li><li>Layout type: ${esc(layoutTypeLabel(inputs.layoutType))}</li><li>Style: ${esc(styleLabel(inputs.style))}</li><li>Mode: ${esc(designModeSettings(inputs.designMode).label)}</li></ul></section>
      <section class="summary-section"><h3>Design logic</h3><ul><li>${esc(region.note)}</li><li>${esc(designModeSettings(inputs.designMode).description)}</li><li>Squirrel handling: ${inputs.squirrelAware ? "factored into choices" : "ignored"}.</li><li>Mosquito-aware edge: ${inputs.mosquitoAware ? "included as an aromatic comfort cue" : "not included"}.</li><li>Data confidence: prototype records are labelled by fit, species specificity, and local verification need.</li></ul></section>
      <section class="summary-section"><h3>Top selected plants</h3><table class="mini-table"><thead><tr><th>Plant</th><th>Qty</th><th>Layer</th><th>Bloom</th></tr></thead><tbody>${plantRows}</tbody></table></section>
      <section class="summary-section"><h3>Layout zones</h3><ul>${zones.map(z=>`<li><strong>${esc(z.title)}:</strong> ${z.plants.slice(0,5).map(esc).join(", ")}</li>`).join("")}</ul></section>
      <section class="summary-section"><h3>Nursery list</h3><table class="mini-table"><thead><tr><th>Plant</th><th>Qty</th><th>Ask for</th></tr></thead><tbody>${nurseryRows}</tbody></table></section>
      <section class="summary-section"><h3>Planting notes</h3><ul><li>Set crowns/root balls at grade; do not plant deeper than the nursery soil line.</li><li>Dig wider than the root ball, roughen clay hole sides, backfill with site soil, and water slowly into the root ball.</li><li>Mulch lightly while keeping mulch away from stems and crowns.</li><li>Use the Layout tab spacing table for center-to-center planting distances in inches; use the plant cards for plant-specific install notes.</li></ul></section>
      <section class="summary-section"><h3>First-season care</h3><ul>${failureWarnings(inputs, palette).slice(0,5).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>
      <section class="summary-section"><h3>Seasonal coverage</h3><ul><li>Spring: ${score.seasonal.spring.months}/3 months, ${score.seasonal.spring.count} species.</li><li>Summer: ${score.seasonal.summer.months}/3 months, ${score.seasonal.summer.count} species.</li><li>Fall: ${score.seasonal.fall.months}/3 months, ${score.seasonal.fall.count} species.</li></ul></section>
      <section class="summary-section"><h3>Data QA summary</h3><ul>${summaryDataQA(palette).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>
    </div>
    <p class="mobile-hint">Print / Save PDF uses this one-page summary view. The full tabs remain available for review in the browser.</p>
  </div>`;
}

function scenarioSummaryText(inputs){
  return `Scenario: ${styleLabel(inputs.style)} / ${layoutTypeLabel(inputs.layoutType)}
Bed shape: ${bedShapeLabel(inputs.bedShape)}
Mulch depth estimate: ${inputs.mulchDepth} inches
ZIP: ${inputs.zip}
Size: ${inputs.length} × ${inputs.depth} ft
Sun: ${siteLabel(inputs.sun)}
Moisture: ${moistureLabel(inputs.moisture)}
Soil: ${soilLabel(inputs.soil, inputs.zip)}
Micro-site: ${conditionLabel(inputs.condition)}
Habitat goals: ${goalListText(inputs)}
Squirrel handling: ${inputs.squirrelAware ? "factor squirrels into choices" : "ignore squirrels"}
Snake-aware planting: ${inputs.snakeAware ? (inputs.snakePlantCandidates ? "open-base plus spiky/aromatic candidates" : "open-base / reduce hiding cover") : "not factored"}
Mosquito-aware edge: ${inputs.mosquitoAware ? "included" : "not included"}
Native-only: ${inputs.nativeOnly ? "yes" : "no"}
Design mode: ${designModeSettings(inputs.designMode).label}`;
}

function feedbackQuestionsText(inputs){
  return `Pollinator Studio prototype feedback

Test scenario
${scenarioSummaryText(inputs)}

Questions
1. What was confusing or unclear?
2. Did the app clearly show whether this was a freestanding bed, fence-line bed, foundation bed, curb strip, patio cluster, or rain pocket?
3. Did the plant recommendations feel realistic for the entered ZIP and region?
4. Would you know what to buy from the nursery list and plant cards?
5. Would you know where to plant things from the layout and placement guidance?
6. Did any safety or wildlife setting feel odd, misleading, or unnecessary?
7. What would stop you from using this to plan a real planting?
8. What is one thing you expected to see but did not?`;
}

function renderTesting(inputs){
  const questions = [
    ["Clarity", "What was confusing, too technical, or hard to find?"],
    ["Yard fit", "Did the layout type and style match the kind of front yard, back yard, fence line, patio, or rain pocket you had in mind?"],
    ["Plant realism", "Did the plant recommendations seem like something a nursery, native plant sale, or gardener in your area would recognize?"],
    ["Actionability", "After reading the plant cards, nursery list, layout, and planting notes, would you know what to buy and where to plant it?"],
    ["Trust", "Did the confidence labels, cautions, mosquito wording, squirrel handling, or snake-aware planting language make the app feel more or less trustworthy?"],
    ["Missing pieces", "What did you expect the app to ask, explain, or show that it did not?"],
    ["Usefulness", "Would you use this for a real planting bed, and what would need to change first?"],
  ];
  return `<div class="test-panel">
    <div class="info print-keep"><strong>How to test:</strong> Generate a design, skim the plant cards, look at the layout and print summary, then answer the questions below. The useful feedback is specific confusion, missing information, or places where the output feels unrealistic.</div>
    <div class="copy-row no-print"><button type="button" class="secondary" onclick="PS.copyFeedbackQuestions()">Copy feedback questions</button><button type="button" class="secondary" onclick="PS.copyScenario()">Copy current test scenario</button><span id="testCopyStatus" class="copy-status" aria-live="polite"></span></div>
    <h3>Current test scenario</h3>
    <div class="feedback-box" id="scenarioText">${esc(scenarioSummaryText(inputs))}</div>
    <h3>Feedback questions</h3>
    <div class="card-grid">${questions.map(([title,body],i)=>`<article class="test-question"><strong>${i+1}. ${esc(title)}</strong><span>${esc(body)}</span></article>`).join("")}</div>
    <h3>Copy-ready feedback form</h3>
    <div class="feedback-box" id="feedbackQuestionsText">${esc(feedbackQuestionsText(inputs))}</div>
    <div class="warning"><strong>Prototype limitation:</strong> This build is for workflow, wording, and recommendation testing. It is not a certified landscape design, pest-control plan, safety guarantee, or final plant availability database.</div>
  </div>`;
}

function renderChangelog(){
  const changes = [
    ["V4.0", "Two-region prototype: adds Colorado Springs / Front Range (80906) native plant set alongside Houston / Gulf Coast (77429). ZIP input now validates strictly — unsupported ZIPs show a friendly message instead of showing all plants. Condition dropdown updates dynamically when ZIP changes. Houston-specific wording generalized throughout."],
    ["V3.0 Static", "Import working single-file build, split into styles.css + js/plant-data.js + js/app.js; Steps 2 and 3 of national expansion: add location:[] tags to all plant records and wire geographic filtering through regionFromZip()/matches()."],
    ["V2.7 Static", "Stability pass: verifies major tabs and restored features, fixes stale version text, restores uploaded-photo edit prompt, keeps print/save PDF working from downloaded local files, and documents the current stable tester build."],
    ["V2.5 Static", "Fixes the UI layout so Garden inputs sit above full-width generated results while preserving the restored planting map, score explanations, uploaded-photo prompt, backup choices, and materials calculator. Corrected spacing language so exact center-to-center inches appear in the Layout tab."],
    ["V2.4 Static", "Regression-fix release that restored the full numbered planting map, score explanations with fix suggestions, and uploaded-photo edit prompt."],
    ["V1.8 Static", "Tester-ready polish: adds sample scenarios, a Test this app tab, copyable feedback questions, current-scenario copying, clearer prototype limits, and a version note for user testing."],
    ["V1.6 Static", "Moves Squirrel handling and Snake-aware planting above Habitat goals, restores the expanded Style / yard intent list, and preserves layout-type behavior."],
    ["V1.5 Static", "Adds snake-aware planting as a visibility/shelter-reduction constraint with conservative cautions around plant-deterrent claims."],
    ["V1.4 Static", "Clarifies rain garden/swale language and expands Style into front-yard and back-yard design intentions while keeping layout type as the physical bed-shape control."],
    ["V1.3 Static", "Adds Planting layout type so outputs distinguish freestanding flower beds from fence-line, foundation, curb/sidewalk, patio/container, and rain-garden pocket layouts."],
    ["V1.2 Static", "User-friendly static demo: keeps the double-click index.html workflow while adding fit review, exclusion reasoning, selected-plant data confidence, and a stronger printable data QA summary."],
    ["V1.1", "QA/content-accuracy pass: tightened broad claims, visible cautions, and prototype-data limitations."],
    ["V1.0", "Demo polish and exportability: Generate / Reset / Print flow, printable one-page design sheet, copy visual prompt, UI changelog, corrected version labels, and mobile/card readability improvements."],
    ["V0.9", "Establishment guidance: first 30 / 60 / 90 days, watering by condition, mulch/weed notes, pruning/cutback guidance, intentional habitat cues, and Houston failure warnings."],
    ["V0.8", "Plant-card instructions: spacing, planting steps, root-ball/crown handling, clay/wet/container notes, and first-season install guidance."],
    ["V0.7", "Multi-select habitat goals, separate squirrel handling, and mosquito-aware aromatic edge option with proper limitations."],
    ["V0.6", "Design modes, substitutions, seasonal scoring, nursery list, and warning panel."],
    ["V0.4–V0.5", "Houston/Texas Gulf Coast reorientation, richer plant cards, layout zoning, and design reasoning."],
  ];
  return `<div class="changelog">${changes.map(([v,n])=>`<article class="change-item"><h3>${esc(v)}</h3><p>${esc(n)}</p></article>`).join("")}</div>`;
}


const regionConditions = {
  "77429": [
    {value:"standard",label:"Standard Houston yard"},
    {value:"gumboClay",label:"Gumbo clay / compacted lawn"},
    {value:"urbanHeat",label:"Urban heat / reflected sun"},
    {value:"streetHellstrip",label:"Street hellstrip / curb edge"},
    {value:"rainGarden",label:"Rain garden / swale: catches runoff after rain"},
    {value:"floodEdge",label:"Flood-prone edge"},
    {value:"coastalExposure",label:"Coastal wind / salt exposure"},
    {value:"heavyClay",label:"Heavy clay / slow drainage"},
    {value:"patioContainer",label:"Patio / container cluster"},
    {value:"postFreeze",label:"Post-freeze recovery planting"},
    {value:"hoaFront",label:"HOA-visible front yard"}
  ],
  "80906": [
    {value:"xeric",label:"Xeric / drought-adapted"},
    {value:"standard",label:"Standard Colorado yard"},
    {value:"rockGarden",label:"Rock garden / excellent drainage"},
    {value:"highDesert",label:"High desert / rocky / alkaline"},
    {value:"shadedSite",label:"Shaded site / north-facing"},
    {value:"urbanHeat",label:"Urban heat / reflected pavement"},
    {value:"patioContainer",label:"Patio / container cluster"},
    {value:"hoaFront",label:"HOA-visible front yard"}
  ]
};

function updateConditionDropdown(zip){
  const z = String(zip).replace(/\D/g, "").slice(0,5);
  const conditions = regionConditions[z];
  const sel = $("condition");
  if(!sel || !conditions) return;
  const current = sel.value;
  sel.innerHTML = conditions.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
  if(conditions.some(o=>o.value === current)) sel.value = current;
  else sel.value = conditions[0].value;
}

const regionSoil = {
  "77429": [
    {value:"unknown", label:"Unknown"},
    {value:"clay",    label:"Clay / gumbo"},
    {value:"loam",    label:"Loam"},
    {value:"sandy",   label:"Sandy"}
  ],
  "80906": [
    {value:"sandy",   label:"Sandy / decomposed granite"},
    {value:"sandy",   label:"Gravelly / rocky"},
    {value:"clay",    label:"Clay (alkaline)"},
    {value:"loam",    label:"Clay loam"},
    {value:"loam",    label:"Loam"},
    {value:"unknown", label:"Not sure"}
  ]
};

const regionMoisture = {
  "77429": [
    {value:"dry",     label:"Dry / fast draining"},
    {value:"average", label:"Average"},
    {value:"wet",     label:"Wet / rain garden"}
  ],
  "80906": [
    {value:"dry",     label:"Xeric / low water"},
    {value:"average", label:"Moderate water"},
    {value:"wet",     label:"Higher water (irrigated or low spot)"}
  ]
};

function updateSoilMoistureDropdowns(zip){
  const z = String(zip).replace(/\D/g,"").slice(0,5);
  [["soil", regionSoil], ["moisture", regionMoisture]].forEach(([id, lookup]) => {
    const opts = lookup[z];
    const sel = $(id);
    if(!sel || !opts) return;
    const current = sel.value;
    sel.innerHTML = opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
    if(opts.some(o=>o.value === current)) sel.value = current;
    else sel.value = opts[0].value;
  });
}

const sampleScenarios = {
  "77429": [
    {id:"sampleFrontBtn", label:"77429 front yard",       run:()=>setSample(["biodiversity","bees"],"frontCurb","full","average","hoaFront",16,6,false,"flowerBed")},
    {id:"sampleBackBtn",  label:"Backyard biodiversity",  run:()=>{setSample(["biodiversity","cardinals","butterflies"],"backyardHabitat","part","average","standard",22,10,false,"flowerBed");$("designMode").value="advanced";generate();}},
    {id:"samplePatioBtn", label:"Patio hummingbirds",     run:()=>setSample(["hummingbirds","butterflies"],"patioView","part","average","patioContainer",12,6,true,"patioCluster")},
    {id:"sampleFenceBtn", label:"Fence-line butterflies", run:()=>setSample(["butterflies","monarchs","bees"],"colorful","full","average","standard",20,5,false,"fenceLine")},
    {id:"sampleRainBtn",  label:"Rain-garden corner",     run:()=>setSample(["biodiversity","monarchs","bees"],"prairie","full","wet","rainGarden",16,8,false,"rainPocket")},
    {id:"sampleSnakeBtn", label:"Snake-aware front bed",  run:()=>{setSample(["biodiversity","bees"],"frontCurb","full","dry","urbanHeat",16,6,false,"flowerBed");$("nativeOnly").checked=false;$("snakeMode").value="spikyAromatic";generate();}}
  ],
  "80906": [
    {id:"sampleFrontBtn", label:"80906 xeric front bed",  run:()=>setSample(["biodiversity","bees"],"frontCurb","full","dry","xeric",16,6,false,"flowerBed","oval","80906")},
    {id:"sampleBackBtn",  label:"Rock garden border",     run:()=>setSample(["bees","butterflies"],"colorful","full","dry","rockGarden",14,5,false,"flowerBed","kidney","80906")},
    {id:"samplePatioBtn", label:"Patio hummingbirds",     run:()=>setSample(["hummingbirds","bees"],"patioView","part","average","patioContainer",10,6,false,"patioCluster","oval","80906")},
    {id:"sampleFenceBtn", label:"High-desert monarchs",   run:()=>setSample(["monarchs","butterflies","bees"],"prairie","full","dry","highDesert",18,7,false,"flowerBed","oval","80906")},
    {id:"sampleRainBtn",  label:"Shaded wildflower bed",  run:()=>setSample(["biodiversity","hummingbirds"],"backyardHabitat","part","average","shadedSite",14,7,false,"flowerBed","kidney","80906")},
    {id:"sampleSnakeBtn", label:"Fence-line pollinators", run:()=>setSample(["butterflies","bees","monarchs"],"colorful","full","dry","xeric",20,5,false,"fenceLine","strip","80906")}
  ]
};

function updateSampleButtons(zip){
  const z = String(zip).replace(/\D/g,"").slice(0,5);
  const scenarios = sampleScenarios[z] || sampleScenarios["77429"];
  scenarios.forEach(s => { const btn = $(s.id); if(btn) btn.textContent = s.label; });
}

function updateBearModeVisibility(zip){
  const container = $("bearModeContainer");
  if(!container) return;
  const isCO = String(zip).replace(/\D/g,"").slice(0,5) === "80906";
  container.style.display = isCO ? "" : "none";
  if(!isCO && $("bearMode")) $("bearMode").value = "ignore";
}

function showTab(name){
  const match = {summary:"Plan summary", palette:"Plant palette", dataqa:"Fit + data QA", layout:"Layout", why:"Why generated", timeline:"Bloom timeline", seasonal:"Seasonal score", shopping:"Nursery list", materials:"Materials", care:"Establishment", risks:"Warnings", score:"Score", region:"Region notes", prompt:"Visual prompt", test:"Test this app", changelog:"Changelog"}[name];
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.textContent === match));
  document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
  const view = $("tab-" + name);
  if(view) view.classList.add("active");
}

function goalList(inputs){
  return inputs.goals && inputs.goals.length ? inputs.goals : [inputs.goal || "biodiversity"];
}
function goalListText(inputs){
  return goalList(inputs).map(g=>goalNames[g] || goalLabel(g)).join(" + ");
}
function goalTitle(inputs){
  const goals = goalList(inputs);
  if(goals.length === 1) return goalLabel(goals[0]);
  return goals.map(g=>goalNames[g] || goalLabel(g)).join(" + ");
}
function wildlifePhrase(inputs){
  const isCO = inputs.locations && inputs.locations[0] === "80906";
  const parts = [];
  if(hasGoal(inputs,"bees")) parts.push("native bees visible on small clustered flowers");
  if(hasGoal(inputs,"butterflies")) parts.push(isCO ? "several Front Range butterflies visiting nectar flowers" : "several Gulf Coast butterflies visiting nectar flowers");
  if(hasGoal(inputs,"monarchs")) parts.push("one monarch butterfly near native milkweed and fall nectar");
  if(hasGoal(inputs,"hummingbirds")) parts.push(isCO ? "one broad-tailed hummingbird visiting tubular flowers" : "one ruby-throated hummingbird visiting red tubular flowers");
  if(hasGoal(inputs,"cardinals")) parts.push("one northern cardinal perched near dense cover, no feeder, no loose seed");
  if(!parts.length || hasGoal(inputs,"biodiversity")) parts.push("native bees, butterflies, one monarch, one hummingbird, and songbirds implied by cover");
  return unique(parts).join("; ");
}
function goalExtraPhrase(inputs){
  const parts = [];
  if(hasGoal(inputs,"bees")) parts.push("bee-forward pollen and nectar continuity");
  if(hasGoal(inputs,"butterflies")) parts.push("butterfly nectar and host-plant support");
  if(hasGoal(inputs,"monarchs")) parts.push("native milkweed host plants plus abundant late-season nectar for migration corridors");
  if(hasGoal(inputs,"hummingbirds")) parts.push("tubular flowers and hummingbird-friendly regional natives");
  if(hasGoal(inputs,"cardinals")) parts.push("songbird habitat with seed heads, berries where appropriate, evergreen or dense cover, and no loose birdseed");
  if(hasGoal(inputs,"biodiversity") || !parts.length) parts.push("high biodiversity habitat with native bees, butterflies, monarch host plants, hummingbirds, songbirds, fall nectar, seed heads, and overwintering structure");
  if(inputs.mosquitoAware) parts.push("an aromatic seating-edge companion strip treated as a comfort cue, not mosquito control");
  return unique(parts).join("; ");
}

function layoutTypeLabel(t){
  return {flowerBed:"freestanding flower bed / island bed", fenceLine:"fence-line or wall planting", foundation:"foundation bed near house", curbStrip:"curb / sidewalk strip", patioCluster:"patio / container cluster", rainPocket:"rain garden / swale pocket"}[t] || "freestanding flower bed / island bed";
}
function layoutTitle(t){
  return {flowerBed:"Flower Bed", fenceLine:"Fence-Line Planting", foundation:"Foundation Bed", curbStrip:"Curb Strip", patioCluster:"Patio Cluster", rainPocket:"Rain-Garden Pocket"}[t] || "Flower Bed";
}
function bedShapeLabel(shape){
  return {oval:"oval / soft island", circle:"circle / round bed", rectangle:"rectangle / straight-edged bed", kidney:"kidney / curved natural bed", corner:"L-shape / corner bed", strip:"narrow strip / ribbon bed"}[shape] || "oval / soft island";
}
function layoutProfile(inputs){
  const t = inputs.layoutType || "flowerBed";
  const profiles = {
    flowerBed:{shape:"island", upperLabel:"CENTER / tallest structure, no fence assumed", lowerLabel:"LOW OUTER EDGE / visible planting edge", structureTag:"Center structure", structureTitle:"Center or rear-third structure", structureWhy:"Use taller plants as anchors near the center, or slightly toward the rear third if the bed is mostly viewed from one side.", frontWhy:"Low plants repeat around the visible edge so the bed reads as intentional from more than one direction.", backPlacement:"Place as center anchors or rear-third structure; do not assume a back fence.", frontPlacement:"Repeat around the outside edge as a low, readable border.", supportTitle:"Optional vertical accent", supportWhy:"Use vine plants only if an obelisk, small trellis, or other support is deliberately added; no fence is assumed."},
    fenceLine:{shape:"border", upperLabel:"FENCE / WALL / vine-support edge", lowerLabel:"FRONT / viewing edge and access line", structureTag:"Back layer", structureTitle:"Fence-line structural layer", structureWhy:"Tall shrubs, grasses, and vines belong along the fence or wall so the bed steps down toward the viewer.", frontWhy:"Low plants form the front edge and keep maintenance access clear.", backPlacement:"Place toward the fence, wall, or trellis-support edge.", frontPlacement:"Use along the front viewing/access edge.", supportTitle:"Fence or trellis line", supportWhy:"Vines can use the fence or added trellis support rather than wandering through the bed."},
    foundation:{shape:"border", upperLabel:"HOUSE WALL / leave air and service gap", lowerLabel:"FRONT / viewing edge and access line", structureTag:"House-side structure", structureTitle:"Foundation back layer", structureWhy:"Keep taller structure near the house side while leaving an air, inspection, and maintenance gap against the wall.", frontWhy:"Lower plants face the lawn/path edge for a tidy front-yard read.", backPlacement:"Place toward the house side but leave an air and service gap; avoid crowding siding, weep holes, or utilities.", frontPlacement:"Use along the outer viewing edge.", supportTitle:"Wall-side trellis only if appropriate", supportWhy:"Only use vines where a separate trellis or support can be kept off siding and access points."},
    curbStrip:{shape:"strip", upperLabel:"STREET / CURB OR PAVEMENT EDGE", lowerLabel:"SIDEWALK / VIEWING AND ACCESS EDGE", structureTag:"Narrow-strip anchors", structureTitle:"Compact vertical rhythm", structureWhy:"Use compact upright plants as repeated anchors; avoid large shrubs that block sightlines or spill into pavement.", frontWhy:"Tough low plants soften the strip edge while preserving pedestrian access.", backPlacement:"Use compact anchors toward the centerline of the strip; avoid assuming a back fence.", frontPlacement:"Keep low plants along both paved edges.", supportTitle:"No fence support assumed", supportWhy:"Avoid unsupported vines in narrow curb strips unless a freestanding approved support is part of the plan."},
    patioCluster:{shape:"cluster", upperLabel:"PATIO / SEATING EDGE", lowerLabel:"CONTAINER FRONTS / ACCESS SIDE", structureTag:"Container anchors", structureTitle:"Tallest containers and anchors", structureWhy:"Put taller plants in the back or center of the container cluster so seating and walking paths stay usable.", frontWhy:"Low plants trail or soften container fronts without blocking access.", backPlacement:"Use as the tallest container or rear/center anchor in the cluster.", frontPlacement:"Use in front containers or edges where it will not block seating/access.", supportTitle:"Container trellis only", supportWhy:"Use compact trellises or obelisks in large pots; no fence line is assumed."},
    rainPocket:{shape:"pocket", upperLabel:"HIGH EDGE / berm or overflow side", lowerLabel:"LOW POINT / wet pocket and access edge", structureTag:"Wet-pocket structure", structureTitle:"Rain-garden upper/center structure", structureWhy:"Use taller tolerant plants near the upper edge or center so water can move through the low point.", frontWhy:"Low wet-tolerant or edge plants define the access side and keep crowns visible.", backPlacement:"Place toward the upper edge or center of the rain-garden pocket, not against an assumed fence.", frontPlacement:"Use along the low/access edge while keeping crowns visible.", supportTitle:"Optional support above wet zone", supportWhy:"Place vines or supports only on the higher edge where roots and hardware will not sit in standing water."}
  };
  return profiles[t] || profiles.flowerBed;
}

function styleLabel(s){
  return {
    tidy:"Tidy front-yard native",
    frontCurb:"Front-yard curb appeal",
    frontFoundation:"Foundation border near house",
    frontEntry:"Entry / mailbox pollinator pocket",
    colorful:"Colorful cottage border",
    prairie:"Pocket coastal prairie",
    backyardHabitat:"Backyard habitat room",
    backyardBorder:"Back-yard layered border",
    patioView:"Patio-view nectar garden",
    wildlife:"Wildlife thicket",
    meadow:"Loose meadow patch"
  }[s] || s;
}
function cap(s){ return styleLabel(s).replace(/(^|\s|\/)([a-z])/g, (m,a,b)=>a+b.toUpperCase()); }
function isFrontYardStyle(s){ return ["tidy","frontCurb","frontFoundation","frontEntry","colorful"].includes(s); }
function isBackYardStyle(s){ return ["backyardHabitat","backyardBorder","wildlife","meadow","patioView"].includes(s); }
function siteLabel(sun){return sun === "full" ? "full-sun" : sun === "part" ? "part-sun" : "shade";}
function moistureLabel(m){return {dry:"dry / fast-draining", average:"average", wet:"wet / rain-garden"}[m] || m;}
function soilLabel(s, zip){
  if(zip === "80906") return {unknown:"unknown soil", sandy:"Sandy / decomposed granite", loam:"Loam / silt", clay:"Clay (alkaline)"}[s] || s;
  return {unknown:"unknown soil", clay:"clay / gumbo", loam:"loam", sandy:"sandy"}[s] || s;
}
function conditionLabel(c){return {standard:"standard yard", gumboClay:"gumbo clay / compacted lawn", urbanHeat:"urban heat / reflected sun", streetHellstrip:"street hellstrip / curb edge", rainGarden:"rain garden / swale: catches runoff after rain", floodEdge:"flood-prone edge", coastalExposure:"coastal wind / salt exposure", heavyClay:"heavy clay / slow drainage", patioContainer:"patio / container cluster", postFreeze:"post-freeze recovery planting", hoaFront:"HOA-visible front yard", xeric:"xeric / drought-adapted", rockGarden:"rock garden / excellent drainage", highDesert:"high desert / rocky / alkaline", shadedSite:"shaded site / north-facing"}[c] || c;}
function goalLabel(goal){
  return {bees:"Bee Pollinator", butterflies:"Butterfly Pollinator", monarchs:"Monarch Habitat", hummingbirds:"Hummingbird Nectar", cardinals:"Cardinal / Songbird Habitat", biodiversity:"Maximum Biodiversity"}[goal] || "Habitat";
}
function layerLabel(layer){return {front:"front / ground layer", middle:"middle", back:"back / structure"}[layer] || layer;}
function shortName(name){
  return name.replace("Gulf Coast ","Gulf ").replace("American ","").replace("Texas ","").replace("Lanceleaf ","").replace("Mealy blue ","Blue ").replace("Scarlet ","").replace("Fall ","").replace("Purple ","").split(" ").slice(0,2).join(" ");
}

function setGoalChecks(goals){
  const list = Array.isArray(goals) ? goals : [goals];
  document.querySelectorAll(".goalCheck").forEach(box => { box.checked = list.includes(box.value); });
  if(!document.querySelectorAll(".goalCheck:checked").length && $("goalBiodiversity")) $("goalBiodiversity").checked = true;
}

function setSample(goals, style, sun="part", moisture="average", condition="standard", length=14, depth=6, mosquitoAware=false, layoutType="flowerBed", bedShape="oval", zip="77429"){
  const list = Array.isArray(goals) ? goals : [goals];
  $("zip").value = zip;
  $("length").value = length;
  $("depth").value = depth;
  $("sun").value = sun;
  $("moisture").value = moisture;
  $("soil").value = (condition === "coastalExposure" || condition === "xeric" || condition === "rockGarden" || condition === "highDesert") ? "sandy" : "clay";
  $("condition").value = condition;
  $("layoutType").value = layoutType;
  if($("bedShape")) $("bedShape").value = bedShape;
  setGoalChecks(list);
  $("squirrelMode").value = "factor";
  $("style").value = style;
  $("designMode").value = list.includes("cardinals") ? "advanced" : "standard";
  $("nativeOnly").checked = true;
  $("petSafe").checked = false;
  $("deer").checked = false;
  $("hoa").checked = !list.includes("cardinals") && isFrontYardStyle(style);
  $("mosquitoAware").checked = mosquitoAware;
  if($("snakeMode")) $("snakeMode").value = "ignore";
  updateConditionDropdown($("zip").value);
  updateSoilMoistureDropdowns($("zip").value);
  generate();
}


function resetInputs(){
  $("zip").value = "77429";
  $("length").value = 14;
  $("depth").value = 6;
  $("sun").value = "part";
  $("moisture").value = "average";
  $("soil").value = "clay";
  $("condition").value = "standard";
  $("layoutType").value = "flowerBed";
  if($("bedShape")) $("bedShape").value = "oval";
  if($("mulchDepth")) $("mulchDepth").value = "3";
  setGoalChecks(["biodiversity"]);
  $("squirrelMode").value = "factor";
  $("style").value = "tidy";
  $("designMode").value = "standard";
  $("nativeOnly").checked = true;
  $("petSafe").checked = false;
  $("deer").checked = false;
  $("hoa").checked = true;
  $("mosquitoAware").checked = false;
  $("snakeMode").value = "ignore";
  if($("bearMode")) $("bearMode").value = "ignore";
  updateConditionDropdown("77429");
  updateSoilMoistureDropdowns("77429");
  updateSampleButtons("77429");
  updateBearModeVisibility("77429");
  $("results").innerHTML = `<div class="empty"><h2>No design generated yet</h2><p class="muted">Click <strong>Generate design</strong>. After generation, the app scrolls to the full-width results area. Use the prominent tabs to review the plan summary, plant palette, layout map, score guidance, warnings, region notes, and visual prompts.</p></div>`;
}

function printDesignSheet(){
  if(!$('tab-summary')) generate();
  showTab('summary');
  if(window && typeof window.print === 'function') window.print();
}

function copyPrompt(){
  const node = $('visualPromptText');
  const status = $('copyStatus');
  const text = node ? node.textContent : '';
  if(!text){ if(status) status.textContent = 'Generate a prompt first.'; return; }
  const done = () => { if(status) status.textContent = 'Copied.'; };
  const fail = () => { if(status) status.textContent = 'Select and copy the prompt text manually.'; };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(fail); }
  else {
    try { const range = document.createRange(); range.selectNodeContents(node); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); document.execCommand('copy') ? done() : fail(); }
    catch(e){ fail(); }
  }
}

function copyTextById(id, statusId){
  const node = $(id);
  const status = $(statusId);
  const text = node ? node.textContent : '';
  if(!text){ if(status) status.textContent = 'Generate a design first.'; return; }
  const done = () => { if(status) status.textContent = 'Copied.'; };
  const fail = () => { if(status) status.textContent = 'Select and copy the text manually.'; };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(fail); }
  else {
    try { const range = document.createRange(); range.selectNodeContents(node); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); document.execCommand('copy') ? done() : fail(); }
    catch(e){ fail(); }
  }
}
function copyUploadedPhotoPrompt(){ copyTextById('uploadedPhotoPromptText', 'copyStatus'); }
function copyFeedbackQuestions(){ copyTextById('feedbackQuestionsText', 'testCopyStatus'); }
function copyScenario(){ copyTextById('scenarioText', 'testCopyStatus'); }

window.PS = {showTab, generate, resetInputs, printDesignSheet, copyPrompt, copyUploadedPhotoPrompt, copyFeedbackQuestions, copyScenario, openPlantImage, closePlantImage};
$("zip").addEventListener("change", () => { updateConditionDropdown($("zip").value); updateSoilMoistureDropdowns($("zip").value); updateSampleButtons($("zip").value); updateBearModeVisibility($("zip").value); });
$("generateBtn").addEventListener("click", generate);
$("resetBtn").addEventListener("click", resetInputs);
$("printBtn").addEventListener("click", printDesignSheet);
["sampleFrontBtn","sampleBackBtn","samplePatioBtn","sampleFenceBtn","sampleRainBtn","sampleSnakeBtn"].forEach(id => {
  $(id).addEventListener("click", () => {
    const z = String($("zip").value).replace(/\D/g,"").slice(0,5);
    const s = (sampleScenarios[z] || sampleScenarios["77429"]).find(x => x.id === id);
    if(s) s.run();
  });
});
updateSoilMoistureDropdowns($("zip").value);
updateSampleButtons($("zip").value);
updateBearModeVisibility($("zip").value);
})();
