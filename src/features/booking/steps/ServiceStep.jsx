import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { COLORS, FONTS } from '../../../constants.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getZoneForPoint } from '../../serviceArea/serviceAreaData.js';
import { buildVisitRows, summarizeVisits } from '../visitModel.js';

const TRANSPORT_SVC = 'Pet Transport (Within DFW)';
const SINGLE_SELECT_CATS = new Set(['Sitting & Visits', 'Dog Walking', 'Transportation']);
const NO_SLOT_SVCS = ['Extended Care Packages', TRANSPORT_SVC];
const MAINTENANCE_SVCS = [
  'Fresh-water Aquarium Maintenance',
  'Rodent Habitat Maintenance',
  'Avian Habitat Maintenance',
];

const MEDICATION_SVC = 'Medication Administration';

function getDateRange(start, end) {
  if (!start) return [];
  const dates = [];
  const curr  = new Date(start + 'T00:00:00');
  const last  = new Date((end || start) + 'T00:00:00');
  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}
function fmtDay(str) { const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'short'}); }
function fmtMD(str)  { const [y,m,d]=str.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

// Count checked checkboxes across all dates and rows
function countChecked(slots) {
  return Object.values(slots || {}).reduce((sum, daySlots) =>
    sum + Object.values(daySlots || {}).filter(Boolean).length, 0);
}

const DEFAULT_ROWS = [{ id: 'morning', label: 'Morning' }, { id: 'evening', label: 'Evening' }];

// Build slots with all row IDs checked for each date in range (used when restoring edit-mode extra services)
function buildEditSlots(startDate, endDate, rows) {
  if (!startDate || !rows || !rows.length) return {};
  const slots = {};
  const curr = new Date(startDate + 'T00:00:00');
  const last = new Date((endDate || startDate) + 'T00:00:00');
  while (curr <= last) {
    const d = curr.toISOString().split('T')[0];
    slots[d] = {};
    rows.forEach(row => { slots[d][row.id] = true; });
    curr.setDate(curr.getDate() + 1);
  }
  return slots;
}

function getServiceSlotConfig(name) {
  if (NO_SLOT_SVCS.includes(name)) return null;
  return { canAdd: true };
}

function getAddonSlotConfig(name) {
  if (name === 'Overnight Stays' || name === 'Mail & Package Retrieval (During Pet Visit)') {
    return { rows: [{ id: 'evening', label: 'Evening' }] };
  }
  return null;
}

function getExtraServiceConfig(name) {
  if (name === 'Mail & Package Retrieval (Outside Pet Visits)') {
    return { type: 'fields' };
  }
  if (name === 'Plant Watering (per 10 plants)') {
    return { type: 'independent_grid', defaultRows: [{ id: 'r0', label: 'Watering' }], canAdd: true, showDetailsField: true };
  }
  if (MAINTENANCE_SVCS.includes(name)) {
    return { type: 'independent_grid', defaultRows: [{ id: 'r0', label: 'Service Days' }], canAdd: true, showPreferredTime: true };
  }
  if (name === MEDICATION_SVC) {
    return { type: 'independent_grid', defaultRows: [...DEFAULT_ROWS], canAdd: true, showDetailsField: true, isMedication: true };
  }
  return { type: 'independent_grid', defaultRows: [...DEFAULT_ROWS], canAdd: true };
}

export default function ServiceStep({ booking }) {
  const { form, update, next } = booking;
  const { user } = useAuth();

  const [allServices, setAllServices]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [collapsedCats, setCollapsedCats]   = useState(new Set());
  const [customerZone, setCustomerZone]     = useState(null);
  const [zoneLoading,  setZoneLoading]      = useState(false);
  const [transOrigin,  setTransOrigin]      = useState(form.transportOrigin || '');
  const [transDest,    setTransDest]        = useState(form.transportDest   || '');
  const [transLoading, setTransLoading]     = useState(false);
  const [transError,   setTransError]       = useState(null);
  const [transPricing, setTransPricing]     = useState(
    form.transportOrigin && form.basePrice ? { miles: null, price: form.basePrice } : null
  );
  const originInputRef = useRef(null);
  const destInputRef   = useRef(null);

  const dates = getDateRange(form.bookingDate, form.bookingEndDate);
  const petCount = Math.max(
    (form.petIds || []).length + (form.petIsNew && (form.newPet?.name || '').trim() ? 1 : 0),
    1
  );
  const servicesById = Object.fromEntries(allServices.map(sv => [sv.id, sv]));
  function petFactor(svc) { return svc && svc.price_per_pet ? petCount : 1; }

  const primaryServices = allServices.filter(s => !s.addon_for);
  const grouped = primaryServices.reduce((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = [];
    acc[svc.category].push(svc);
    return acc;
  }, {});
  const selectedPrimary     = allServices.find(s => s.id === form.serviceId);
  const isTransportSelected = selectedPrimary?.name === TRANSPORT_SVC;

  function getDependentAddons(svc) {
    return allServices.filter(s => s.addon_for && s.addon_for.includes(svc.name));
  }
  function toggleCat(cat) {
    setCollapsedCats(prev => { const s=new Set(prev); s.has(cat)?s.delete(cat):s.add(cat); return s; });
  }

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('services').select('id, category, name, description, base_price, addon_for, price_per_pet')
        .eq('is_active', true).order('sort_order');
      if (err) { setError(err.message); setLoading(false); return; }
      setAllServices(data);
      setLoading(false);
      const cats = [...new Set(data.filter(s => !s.addon_for).map(s => s.category))];
      setCollapsedCats(new Set(cats.filter(c => c !== 'Sitting & Visits')));

      // ── Edit-mode: redistribute addon_service_ids into addonIds vs extraServiceIds ──
      // When editing, BookingPage passes ALL addon_service_ids as form.addonIds.
      // But the UI renders multi-select "extra services" (Plant Watering etc.) under
      // form.extraServiceIds. Split them here now that we have the service data.
      if (form.editBookingId && (form.addonIds || []).length > 0) {
        const svcMap = Object.fromEntries(data.map(s => [s.id, s]));
        const trueAddonIds   = [];
        const trueAddonNames = [];
        const extraIds       = [];
        const extraNames     = [];
        const extraData      = {};

        form.addonIds.forEach(id => {
          const svc = svcMap[id];
          if (!svc) return;
          const isDependent = svc.addon_for && svc.addon_for.length > 0;
          if (isDependent) {
            trueAddonIds.push(id);
            trueAddonNames.push(svc.name);
          } else {
            // Extra service (independent multi-select category)
            extraIds.push(id);
            extraNames.push(svc.name);
            const cfg      = getExtraServiceConfig(svc.name);
            const editRows  = cfg.defaultRows ? [...cfg.defaultRows] : [...DEFAULT_ROWS];
            const editSlots = cfg.type !== 'fields'
              ? buildEditSlots(form.bookingDate, form.bookingEndDate, editRows)
              : {};
            extraData[id] = {
              rows:          editRows,
              slots:         editSlots,
              preferredTime: '',
              date:          '',
              time:          '',
              details:       '',
            };
          }
        });

        // Compute extraTotal from the pre-checked slots × per-unit price
        const extraTotal = extraIds.reduce((sum, id) => {
          const svc = svcMap[id];
          if (!svc || svc.base_price === null) return sum;
          const cfg = getExtraServiceConfig(svc.name);
          if (cfg.type === 'fields') return sum + Number(svc.base_price);
          return sum + Number(svc.base_price) * countChecked((extraData[id] || {}).slots || {});
        }, 0);

        // Compute addonTotal from pre-checked addonSlots (set by BookingPage.initialOverride)
        const addonTotal = trueAddonIds.reduce((sum, id) => {
          const svc = svcMap[id];
          if (!svc || svc.base_price === null) return sum;
          return sum + Number(svc.base_price) * countChecked((form.addonSlots || {})[id] || {});
        }, 0);

        update({
          addonIds:          trueAddonIds,
          addonNames:        trueAddonNames,
          addonTotal,
          extraServiceIds:   extraIds,
          extraServiceNames: extraNames,
          extraServiceData:  extraData,
          extraTotal,
        });
      }
    }
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    function onMapsReady() {
      if (cancelled) return;
      setZoneLoading(true);
      supabase.from('customers').select('address').eq('id', user.id).single()
        .then(({ data }) => {
          if (cancelled || !data?.address) { setZoneLoading(false); return; }
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: data.address, region: 'us' }, (results, status) => {
            if (cancelled) return;
            setZoneLoading(false);
            if (status !== 'OK' || !results.length) return;
            const loc  = results[0].geometry.location;
            const zone = getZoneForPoint({ lat: loc.lat(), lng: loc.lng() });
            if (zone) { setCustomerZone(zone); update({ address: data.address, zone: zone.label, travelFee: zone.fee }); }
          });
        });
    }
    const scriptId = 'gm-places-script';
    if (window.google?.maps?.places) { onMapsReady(); }
    else if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      s.async = true; s.onload = onMapsReady;
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => { if (window.google?.maps?.places) { clearInterval(t); onMapsReady(); } }, 100);
      return () => { cancelled = true; clearInterval(t); };
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!isTransportSelected) return;
    function doInit() {
      if (!window.google?.maps?.places || !originInputRef.current || !destInputRef.current) return;
      const opts = { componentRestrictions: { country: 'us' } };
      const oAC = new window.google.maps.places.Autocomplete(originInputRef.current, opts);
      oAC.addListener('place_changed', () => {
        const addr = oAC.getPlace()?.formatted_address || originInputRef.current.value;
        setTransOrigin(addr);
        const d = destInputRef.current?.value || '';
        if (addr.trim() && d.trim()) calcDistanceWith(addr, d);
      });
      const dAC = new window.google.maps.places.Autocomplete(destInputRef.current, opts);
      dAC.addListener('place_changed', () => {
        const addr = dAC.getPlace()?.formatted_address || destInputRef.current.value;
        setTransDest(addr);
        const o = originInputRef.current?.value || '';
        if (o.trim() && addr.trim()) calcDistanceWith(o, addr);
      });
    }
    if (window.google?.maps?.places) { doInit(); }
    else { const t = setInterval(() => { if (window.google?.maps?.places) { clearInterval(t); doInit(); } }, 100); return () => clearInterval(t); }
  }, [isTransportSelected]); // eslint-disable-line

  // Build initial slots from pet schedule times across all booking dates
  function buildScheduleSlots(dates, times) {
    if (!times || !times.length || !dates || !dates.length) return {};
    const slots = {};
    dates.forEach(d => {
      slots[d] = {};
      times.forEach(t => { slots[d][t] = true; });
    });
    return slots;
  }

  function buildScheduleRows(times) {
    const ORDER = ['morning', 'midday', 'evening'];
    const LABELS = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };
    const filtered = ORDER.filter(t => times.includes(t));
    return filtered.length > 0
      ? filtered.map(t => ({ id: t, label: LABELS[t] }))
      : null; // null = use DEFAULT_ROWS
  }

  function selectPrimary(svc) {
    const isTransport = svc.name === TRANSPORT_SVC;
    const isQuote     = !isTransport && (svc.base_price === null || svc.base_price === undefined);
    const config      = getServiceSlotConfig(svc.name);
    const unitPrice   = isQuote || isTransport ? 0 : Number(svc.base_price);

    // Pre-populate slots from pet schedule if available
    const ps = form.petSchedule;
    let initSlots = {};
    let initRows  = config ? [...DEFAULT_ROWS] : [];
    if (!isTransport && !isQuote && config && ps) {
      const FEEDING_CATS = new Set(['Sitting & Visits']);
      const WALKING_CATS = new Set(['Dog Walking']);
      const SLOT_ORDER   = ['morning', 'midday', 'evening'];
      const times = FEEDING_CATS.has(svc.category)
        // Drop-In covers all scheduled activities — union of feeding + walking times
        ? SLOT_ORDER.filter(t =>
            (ps.feeding_times || []).includes(t) || (ps.walking_times || []).includes(t))
        : WALKING_CATS.has(svc.category)
          ? (ps.walking_times || [])
          : [];
      if (times.length > 0) {
        const datesNow = getDateRange(form.bookingDate, form.bookingEndDate);
        initSlots = buildScheduleSlots(datesNow, times);
        initRows  = buildScheduleRows(times) || initRows;
      }
    }
    const preCount = Object.values(initSlots).reduce(
      (s, day) => s + Object.values(day).filter(Boolean).length, 0);

    update({
      serviceId:        svc.id,
      serviceName:      svc.name,
      basePrice:        preCount > 0 ? unitPrice * preCount : unitPrice,
      baseUnitPrice:    unitPrice,
      isQuote,
      addonIds:         [],
      addonNames:       [],
      addonTotal:       0,
      serviceSlots:     initSlots,
      addonSlots:       {},
      addonSlotRows:    {},
      serviceSlotRows:  initRows,
      transportOrigin:  isTransport ? transOrigin : '',
      transportDest:    isTransport ? transDest   : '',
    });
    if (!isTransport) { setTransOrigin(''); setTransDest(''); setTransPricing(null); setTransError(null); }
  }

  function toggleExtraService(svc) {
    const ids   = form.extraServiceIds   || [];
    const names = form.extraServiceNames || [];
    const sel   = ids.includes(svc.id);
    const newIds   = sel ? ids.filter(id => id !== svc.id)   : [...ids,   svc.id];
    const newNames = sel ? names.filter(n => n !== svc.name) : [...names, svc.name];
    const newExtraData = { ...(form.extraServiceData || {}) };
    if (!sel) {
      const cfg = getExtraServiceConfig(svc.name);
      let initSlots = {};
      let initRows  = cfg.defaultRows ? [...cfg.defaultRows] : [...DEFAULT_ROWS];
      // Pre-populate medication slots from pet schedule
      if (cfg.isMedication) {
        const ps = form.petSchedule;
        const medTimes = ps ? (ps.medication_times || []) : [];
        if (medTimes.length > 0) {
          const datesNow = getDateRange(form.bookingDate, form.bookingEndDate);
          initSlots = buildScheduleSlots(datesNow, medTimes);
          initRows  = buildScheduleRows(medTimes) || initRows;
        }
      }
      newExtraData[svc.id] = { rows: initRows, slots: initSlots, preferredTime: '', date: '', time: '', details: '' };
    } else {
      delete newExtraData[svc.id];
    }
    const newTotal = allServices
      .filter(s => newIds.includes(s.id) && s.base_price !== null)
      .reduce((sum, s) => {
        const cfg = getExtraServiceConfig(s.name);
        if (cfg.type === 'fields') return sum + Number(s.base_price);
        return sum + Number(s.base_price) * countChecked((newExtraData[s.id] || {}).slots || {});
      }, 0);
    update({ extraServiceIds: newIds, extraServiceNames: newNames, extraTotal: newTotal, extraServiceData: newExtraData });
  }

  function updateExtraServiceData(svcId, patch) {
    const cur = (form.extraServiceData || {})[svcId] || {};
    const newData = { ...(form.extraServiceData || {}), [svcId]: { ...cur, ...patch } };
    const fields = { extraServiceData: newData };
    if ('slots' in patch) {
      fields.extraTotal = (form.extraServiceIds || []).reduce((sum, id) => {
        const svc = allServices.find(s => s.id === id);
        if (!svc || svc.base_price === null) return sum;
        const cfg = getExtraServiceConfig(svc.name);
        if (cfg.type === 'fields') return sum + Number(svc.base_price);
        return sum + Number(svc.base_price) * countChecked((newData[id] || {}).slots || {});
      }, 0);
    }
    update(fields);
  }

  function handleSlotChange(newSlots) {
    const n    = countChecked(newSlots);
    const unit = form.baseUnitPrice || Number(selectedPrimary?.base_price || 0);
    // Cascade parent unchecks to all addon slots
    const prevSlots     = form.serviceSlots || {};
    const newAddonSlots = { ...(form.addonSlots || {}) };
    let addonChanged    = false;
    (form.addonIds || []).forEach(addonId => {
      const addonSlots = { ...(newAddonSlots[addonId] || {}) };
      let innerChanged = false;
      Object.keys(prevSlots).forEach(date => {
        Object.keys(prevSlots[date] || {}).forEach(rowId => {
          if (prevSlots[date][rowId] && !newSlots?.[date]?.[rowId]) {
            if (addonSlots[date]?.[rowId]) {
              addonSlots[date] = { ...(addonSlots[date] || {}), [rowId]: false };
              innerChanged = true;
            }
          }
        });
      });
      if (innerChanged) { newAddonSlots[addonId] = addonSlots; addonChanged = true; }
    });
    const updates = { serviceSlots: newSlots, basePrice: unit * n };
    if (addonChanged) {
      const newAddonTotal = (form.addonIds || []).reduce((sum, id) => {
        const svc = allServices.find(s => s.id === id);
        if (!svc || svc.base_price === null) return sum;
        return sum + Number(svc.base_price) * countChecked(newAddonSlots[id] || {});
      }, 0);
      updates.addonSlots = newAddonSlots;
      updates.addonTotal = newAddonTotal;
    }
    update(updates);
  }
  function handleRowsChange(newRows) { update({ serviceSlotRows: newRows }); }

  function handleAddonSlotChange(addonId, newSlots) {
    const newAddonSlots = { ...(form.addonSlots || {}), [addonId]: newSlots };
    // Auto-check parent for any addon slot that is now checked but parent is not
    const parentSlots = { ...(form.serviceSlots || {}) };
    let parentChanged = false;
    Object.entries(newSlots).forEach(([date, daySlots]) => {
      Object.entries(daySlots || {}).forEach(([rowId, checked]) => {
        if (checked && !parentSlots?.[date]?.[rowId]) {
          parentSlots[date] = { ...(parentSlots[date] || {}), [rowId]: true };
          parentChanged = true;
        }
      });
    });
    const newTotal = (form.addonIds || []).reduce((sum, id) => {
      const svc = allServices.find(s => s.id === id);
      if (!svc || svc.base_price === null) return sum;
      return sum + Number(svc.base_price) * countChecked(newAddonSlots[id] || {});
    }, 0);
    const updates = { addonSlots: newAddonSlots, addonTotal: newTotal };
    if (parentChanged) {
      const unit = form.baseUnitPrice || Number(selectedPrimary?.base_price || 0);
      updates.serviceSlots = parentSlots;
      updates.basePrice    = unit * countChecked(parentSlots);
    }
    update(updates);
  }
  function handleAddonRowsChange(addonId, newRows) {
    update({ addonSlotRows: { ...(form.addonSlotRows || {}), [addonId]: newRows } });
  }

  function toggleAddon(svc) {
    const ids   = form.addonIds   || [];
    const names = form.addonNames || [];
    const sel   = ids.includes(svc.id);
    const newIds   = sel ? ids.filter(id => id !== svc.id)   : [...ids,   svc.id];
    const newNames = sel ? names.filter(n => n !== svc.name) : [...names, svc.name];
    const newAddonSlots    = { ...(form.addonSlots    || {}) };
    const newAddonSlotRows = { ...(form.addonSlotRows || {}) };
    if (!sel) {
      // Pre-populate slots from pet schedule for Dog Walking addons
      const ps = form.petSchedule;
      const addonCfg = getAddonSlotConfig(svc.name);
      const walkingCats = new Set(['Dog Walking']);
      let initAddonSlots = {};
      let initAddonRows  = addonCfg?.rows ? [...addonCfg.rows] : [...(form.serviceSlotRows || DEFAULT_ROWS)];
      if (ps && walkingCats.has(svc.category) && (ps.walking_times || []).length > 0) {
        const datesNow = getDateRange(form.bookingDate, form.bookingEndDate);
        initAddonSlots = buildScheduleSlots(datesNow, ps.walking_times);
        initAddonRows  = buildScheduleRows(ps.walking_times) || initAddonRows;
      }
      newAddonSlots[svc.id]    = initAddonSlots;
      newAddonSlotRows[svc.id] = initAddonRows;
    } else {
      delete newAddonSlots[svc.id];
      delete newAddonSlotRows[svc.id];
    }
    const newTotal = allServices
      .filter(a => newIds.includes(a.id) && a.base_price !== null)
      .reduce((sum, a) => sum + Number(a.base_price) * countChecked(newAddonSlots[a.id] || {}), 0);
    update({ addonIds: newIds, addonNames: newNames, addonTotal: newTotal, addonSlots: newAddonSlots, addonSlotRows: newAddonSlotRows });
  }

  function calcDistanceWith(origin, dest) {
    if (!origin.trim() || !dest.trim() || !window.google?.maps?.DistanceMatrixService) return;
    setTransLoading(true); setTransError(null); setTransPricing(null);
    new window.google.maps.DistanceMatrixService().getDistanceMatrix(
      { origins: [origin.trim()], destinations: [dest.trim()],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem:  window.google.maps.UnitSystem.IMPERIAL },
      (response, status) => {
        setTransLoading(false);
        const el = response?.rows?.[0]?.elements?.[0];
        if (status !== 'OK' || el?.status !== 'OK') { setTransError('Could not calculate distance — please check both addresses.'); return; }
        const miles = el.distance.value / 1609.344;
        const price = 25 + Math.ceil(miles / 5) * 5;
        setTransPricing({ miles: miles.toFixed(1), price });
        update({ basePrice: price, baseUnitPrice: price, isQuote: false, transportOrigin: origin.trim(), transportDest: dest.trim() });
      }
    );
  }
  function calcDistance() {
    calcDistanceWith(originInputRef.current?.value || transOrigin, destInputRef.current?.value || transDest);
  }

  // Live price display: updates as checkboxes are selected
  function displayPrimaryPrice(svc) {
    if (svc.name === TRANSPORT_SVC) return transPricing ? `$${transPricing.price}` : 'From $25';
    if (svc.base_price === null || svc.base_price === undefined) return 'Request a Quote';
    if (form.serviceId === svc.id) {
      const n = countChecked(form.serviceSlots || {});
      if (n > 0) return `$${(Number(svc.base_price) * petFactor(svc) * n).toLocaleString()}`;
    }
    return `$${Number(svc.base_price) * petFactor(svc)}`;
  }
  function displayAddonPrice(addon) {
    if (addon.base_price === null || addon.base_price === undefined) return 'Quote';
    if ((form.addonIds || []).includes(addon.id)) {
      const n = countChecked((form.addonSlots || {})[addon.id] || {});
      if (n > 0) return `+$${(Number(addon.base_price) * petFactor(addon) * n).toLocaleString()}`;
    }
    return `+$${Number(addon.base_price) * petFactor(addon)}`;
  }
  function displayExtraPrice(svc) {
    if (svc.base_price === null || svc.base_price === undefined) return 'Quote';
    if ((form.extraServiceIds || []).includes(svc.id)) {
      const cfg = getExtraServiceConfig(svc.name);
      if (cfg.type !== 'fields') {
        const n = countChecked(((form.extraServiceData || {})[svc.id] || {}).slots || {});
        if (n > 0) return `$${(Number(svc.base_price) * petFactor(svc) * n).toLocaleString()}`;
      }
    }
    return `$${Number(svc.base_price) * petFactor(svc)}`;
  }

  // Running total — derived from the same visit model used at persist time,
  // so the estimate shown here always reconciles with the final invoice.
  const _visitRows   = buildVisitRows(form, servicesById);
  const _visitTotals = summarizeVisits(_visitRows, form.travelFee || 0);
  const runningTotal = _visitTotals.total;
  const hasSelection = _visitRows.length > 0 || !!form.serviceId || (form.extraServiceIds || []).length > 0;

  const hasPrimary  = !!form.serviceId;
  const hasExtra    = (form.extraServiceIds || []).length > 0;
  const canContinue = (hasPrimary || hasExtra) && (!isTransportSelected || transPricing !== null);

  if (loading) return <p style={styles.msg}>Loading services…</p>;
  if (error)   return <p style={styles.error}>Could not load services: {error}</p>;

  const isZone9 = customerZone?.label === 'Zone 9';

  return (
    <div>
      <p style={styles.subhead}>Choose the service(s) you need.</p>

      {zoneLoading && <p style={styles.zoneNote}>Calculating travel fees for your area…</p>}
      {customerZone && !isZone9 && customerZone.fee > 0 && (
        <div style={styles.zoneBanner}>
          A <strong>${customerZone.fee % 1 === 0 ? customerZone.fee : customerZone.fee.toFixed(2)}</strong> travel fee will be added once per day — prices below are base rates only.
        </div>
      )}
      {isZone9 && (
        <div style={styles.zoneBanner}>
          You&apos;re in Zone 9 — a travel fee will be confirmed and added once per day.
        </div>
      )}

      {Object.entries(grouped).map(([cat, svcs]) => {
        const isMultiSelect = !SINGLE_SELECT_CATS.has(cat);
        const isCollapsed   = collapsedCats.has(cat);
        const hasSelected   = isMultiSelect
          ? svcs.some(s => (form.extraServiceIds || []).includes(s.id))
          : svcs.some(s => s.id === form.serviceId);
        return (
          <div key={cat} style={styles.category}>
            <button style={styles.catHeader} onClick={() => toggleCat(cat)}>
              <span style={{ ...styles.catName, ...(hasSelected ? styles.catNameActive : {}) }}>{cat}</span>
              <span style={styles.chevron}>{isCollapsed ? '▸' : '▾'}</span>
            </button>

            {!isCollapsed && svcs.map(svc => {
              if (isMultiSelect) {
                const isExtraSel = (form.extraServiceIds || []).includes(svc.id);
                const cfg        = getExtraServiceConfig(svc.name);
                const extraData  = (form.extraServiceData || {})[svc.id] || {};
                return (
                  <div key={svc.id}>
                    <button style={{ ...styles.serviceBtn, ...(isExtraSel ? styles.serviceBtnSelected : {}) }}
                      onClick={() => toggleExtraService(svc)}>
                      <span style={styles.svcName}>{svc.name}</span>
                      <span style={styles.svcPrice}>{displayExtraPrice(svc)}</span>
                      <span style={styles.svcDesc}>{svc.description}</span>
                    </button>

                    {isExtraSel && cfg.type === 'fields' && (
                      <div style={styles.extraFieldsBlock}>
                        <div style={styles.extraFieldsRow}>
                          <label style={styles.extraFieldLabel}>Date
                            <input type='date' style={styles.extraFieldInput}
                              value={extraData.date || ''}
                              onChange={e => updateExtraServiceData(svc.id, { date: e.target.value })} />
                          </label>
                          <label style={styles.extraFieldLabel}>Time
                            <input type='time' style={styles.extraFieldInput}
                              value={extraData.time || ''}
                              onChange={e => updateExtraServiceData(svc.id, { time: e.target.value })} />
                          </label>
                        </div>
                        <label style={{ ...styles.extraFieldLabel, width: '100%' }}>Details
                          <textarea style={styles.extraFieldTextarea} rows={2}
                            value={extraData.details || ''}
                            onChange={e => updateExtraServiceData(svc.id, { details: e.target.value })}
                            placeholder='Building access, mailbox location, special instructions…' />
                        </label>
                      </div>
                    )}

                    {isExtraSel && cfg.type === 'independent_grid' && dates.length > 0 && (
                      <div>
                        {cfg.showPreferredTime && (
                          <div style={styles.preferredTimeBlock}>
                            <label style={styles.preferredTimeLabel}>Preferred Time
                              <input type='time' style={styles.preferredTimeInput}
                                value={extraData.preferredTime || ''}
                                onChange={e => updateExtraServiceData(svc.id, { preferredTime: e.target.value })} />
                            </label>
                          </div>
                        )}
                        <SlotGrid
                          dates={dates} slots={extraData.slots || {}}
                          rows={extraData.rows || cfg.defaultRows || DEFAULT_ROWS}
                          onChange={newSlots => updateExtraServiceData(svc.id, { slots: newSlots })}
                          onRowsChange={newRows => updateExtraServiceData(svc.id, { rows: newRows })}
                          canAdd />
                        {cfg.showDetailsField && (
                          <div style={styles.detailsFieldBlock}>
                            <label style={styles.extraFieldLabel}>Details
                              <textarea style={styles.extraFieldTextarea} rows={2}
                                value={extraData.details || ''}
                                onChange={e => updateExtraServiceData(svc.id, { details: e.target.value })}
                                placeholder='Plant locations, watering amounts, special instructions…' />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Single-select ─────────────────────────────────────────────────────────────
              const selected    = form.serviceId === svc.id;
              const isTransport = svc.name === TRANSPORT_SVC;
              const depAddons   = selected && !isTransport ? getDependentAddons(svc) : [];
              const showGrid    = selected && dates.length > 0 && getServiceSlotConfig(svc.name) !== null;
              return (
                <div key={svc.id}>
                  <button style={{ ...styles.serviceBtn, ...(selected ? styles.serviceBtnSelected : {}) }}
                    onClick={() => selectPrimary(svc)}>
                    <span style={styles.svcName}>{svc.name}</span>
                    <span style={styles.svcPrice}>{displayPrimaryPrice(svc)}</span>
                    <span style={styles.svcDesc}>{svc.description}</span>
                  </button>

                  {showGrid && (
                    <SlotGrid dates={dates} slots={form.serviceSlots || {}}
                      rows={form.serviceSlotRows || DEFAULT_ROWS}
                      onChange={handleSlotChange} onRowsChange={handleRowsChange} canAdd />
                  )}

                  {selected && isTransport && (
                    <div style={styles.transportBlock}>
                      <label style={styles.transportLabel}>Pickup address
                        <input ref={originInputRef} style={styles.transportInput} type='text'
                          placeholder='123 Main St, Dallas, TX 75201'
                          value={transOrigin} onChange={e => setTransOrigin(e.target.value)}
                          onBlur={calcDistance} autoComplete='street-address' />
                      </label>
                      <label style={styles.transportLabel}>Drop-off address
                        <input ref={destInputRef} style={styles.transportInput} type='text'
                          placeholder='456 Oak Ave, Fort Worth, TX 76102'
                          value={transDest} onChange={e => setTransDest(e.target.value)}
                          onBlur={calcDistance} autoComplete='street-address' />
                      </label>
                      {transLoading && <p style={styles.transNote}>Calculating route…</p>}
                      {transError   && <p style={styles.transErr}>{transError}</p>}
                      {transPricing && (
                        <p style={styles.transPriceResult}>
                          {transPricing.miles} miles —{' '}
                          <strong style={{ color: COLORS.blue }}>${transPricing.price}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {depAddons.length > 0 && (
                    <div style={styles.depList}>
                      <p style={styles.depNote}>Optional extras for this service:</p>
                      {depAddons.map(addon => {
                        const addonSel  = (form.addonIds || []).includes(addon.id);
                        const addonRows = (form.addonSlotRows || {})[addon.id]
                          || getAddonSlotConfig(addon.name)?.rows
                          || (form.serviceSlotRows || DEFAULT_ROWS);
                        const showAddonGrid = addonSel && dates.length > 0 && addonRows.length > 0;
                        return (
                          <div key={addon.id}>
                            <button style={{ ...styles.depBtn, ...(addonSel ? styles.addonSelected : {}) }}
                              onClick={() => toggleAddon(addon)}>
                              <span style={styles.svcName}>{addon.name}</span>
                              <span style={styles.svcPrice}>{displayAddonPrice(addon)}</span>
                              <span style={styles.svcDesc}>{addon.description}</span>
                            </button>
                            {showAddonGrid && (
                              <SlotGrid dates={dates}
                                slots={(form.addonSlots || {})[addon.id] || {}}
                                rows={addonRows}
                                onChange={newSlots => handleAddonSlotChange(addon.id, newSlots)}
                                onRowsChange={newRows => handleAddonRowsChange(addon.id, newRows)}
                                canAdd />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {hasSelection && (
        <div style={styles.runningTotal}>
          <span style={styles.runningTotalLabel}>Estimated Total</span>
          <span style={styles.runningTotalValue}>
            {form.isQuote ? 'Quote required' : `$${runningTotal.toFixed(2)}`}
            {!form.travelFee && customerZone && (
              <span style={styles.runningTotalNote}> (+ travel fee on invoice)</span>
            )}
          </span>
        </div>
      )}

      <div style={styles.footer}>
        <button style={styles.primaryBtn} onClick={next} disabled={!canContinue}>Continue</button>
      </div>
    </div>
  );
}

ServiceStep.propTypes = { booking: PropTypes.object.isRequired };

function SlotGrid({ dates, slots, rows, onChange, onRowsChange, canAdd }) {
  function toggleCell(d, rowId) {
    onChange({ ...slots, [d]: { ...(slots[d] || {}), [rowId]: !(slots?.[d]?.[rowId]) } });
  }
  function toggleAll(rowId) {
    const allChecked = dates.length > 0 && dates.every(d => slots?.[d]?.[rowId]);
    const next = { ...slots };
    dates.forEach(d => { next[d] = { ...(next[d] || {}), [rowId]: !allChecked }; });
    onChange(next);
  }
  function updateLabel(idx, val) {
    if (!onRowsChange) return;
    onRowsChange(rows.map((r, i) => i === idx ? { ...r, label: val } : r));
  }
  function addRow() {
    if (!onRowsChange) return;
    onRowsChange([...rows, { id: `custom_${Date.now()}`, label: 'Custom' }]);
  }
  if (!rows.length) return null;
  return (
    <div style={sg.wrap}>
      <div style={sg.scroll}>
        <table style={sg.table}>
          <thead>
            <tr>
              <th style={sg.thAll} />
              <th style={sg.thLabel} />
              {dates.map(d => (
                <th key={d} style={sg.thDate}>
                  <span style={sg.dayLbl}>{fmtDay(d)}</span>
                  <span style={sg.mdLbl}>{fmtMD(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const allChecked  = dates.length > 0 && dates.every(d => slots?.[d]?.[row.id]);
              const someChecked = dates.some(d => slots?.[d]?.[row.id]);
              return (
                <tr key={row.id}>
                  <td style={sg.tdAll}>
                    <input type='checkbox' style={sg.chk} checked={allChecked}
                      onChange={() => toggleAll(row.id)}
                      ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} />
                  </td>
                  <td style={sg.tdLbl}>
                    {onRowsChange
                      ? <input type='text' value={row.label} onChange={e => updateLabel(idx, e.target.value)} style={sg.lblInput} />
                      : <span style={sg.lblText}>{row.label}</span>}
                  </td>
                  {dates.map(d => (
                    <td key={d} style={sg.tdChk}>
                      <input type='checkbox' style={sg.chk}
                        checked={!!(slots?.[d]?.[row.id])}
                        onChange={() => toggleCell(d, row.id)} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canAdd && onRowsChange && (
        <button style={sg.addRowBtn} onClick={addRow}>+ Add Row</button>
      )}
    </div>
  );
}

SlotGrid.propTypes = {
  dates:        PropTypes.arrayOf(PropTypes.string).isRequired,
  slots:        PropTypes.object.isRequired,
  rows:         PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })).isRequired,
  onChange:     PropTypes.func.isRequired,
  onRowsChange: PropTypes.func,
  canAdd:       PropTypes.bool,
};

const styles = {
  subhead:  { fontFamily: FONTS.body, fontSize: '1rem', color: '#444', marginBottom: '0.75rem' },
  msg:      { fontFamily: FONTS.body, color: '#666', padding: '1rem' },
  error:    { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  zoneNote: { fontFamily: FONTS.body, fontSize: '0.83rem', color: '#888', marginBottom: '0.75rem' },
  zoneBanner: { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#1a5f8a', background: '#e8f4fd', border: '1px solid #b8d8f0', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.85rem' },
  category: { marginBottom: '0.75rem', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' },
  catHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: '#f7f7f7', border: 'none', cursor: 'pointer' },
  catName:       { fontFamily: FONTS.header, fontSize: '0.95rem', fontWeight: 600, color: '#333' },
  catNameActive: { color: COLORS.blue },
  chevron:       { fontSize: '0.8rem', color: '#888' },
  serviceBtn: { display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto auto', gap: '0.2rem 0.5rem', width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem', background: '#fff', border: 'none', borderTop: '1px solid #f0f0f0', cursor: 'pointer' },
  serviceBtnSelected: { background: '#e8f4fd' },
  addonSelected:      { background: '#edf7ed' },
  svcName:  { fontFamily: FONTS.body, fontWeight: 600, fontSize: '0.9rem', color: '#222', gridColumn: 1 },
  svcPrice: { fontFamily: FONTS.body, fontWeight: 700, fontSize: '0.9rem', color: COLORS.blue, gridColumn: 2, gridRow: '1 / span 2', alignSelf: 'center', whiteSpace: 'nowrap' },
  svcDesc:  { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#666', gridColumn: 1, gridRow: 2 },
  depList:  { background: '#f9f9f9', paddingLeft: '1.5rem', borderTop: '1px solid #eee' },
  depNote:  { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#888', margin: '0.4rem 0 0.2rem' },
  depBtn: { display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto auto', gap: '0.2rem 0.5rem', width: '100%', textAlign: 'left', padding: '0.55rem 0.85rem 0.55rem 0.5rem', background: 'transparent', border: 'none', borderTop: '1px solid #eee', cursor: 'pointer' },
  transportBlock: { padding: '0.75rem 0.85rem', background: '#f0f7ff', borderTop: '1px solid #d0e8f8', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  transportLabel: { display: 'flex', flexDirection: 'column', gap: '0.2rem', fontFamily: FONTS.body, fontSize: '0.85rem', color: '#444', fontWeight: 600 },
  transportInput: { fontFamily: FONTS.body, fontSize: '0.9rem', padding: '0.45rem 0.6rem', border: '1px solid #b0cfe8', borderRadius: '6px', color: '#222', background: '#fff', outline: 'none' },
  transNote:        { fontFamily: FONTS.body, fontSize: '0.82rem', color: '#888', margin: 0 },
  transErr:         { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.red, margin: 0 },
  transPriceResult: { fontFamily: FONTS.body, fontSize: '0.9rem', color: '#333', margin: 0 },
  extraFieldsBlock: { padding: '0.6rem 0.85rem 0.65rem', background: '#f5faff', borderTop: '1px solid #d8ecf8', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  extraFieldsRow:   { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  extraFieldLabel:  { display: 'flex', flexDirection: 'column', gap: '0.2rem', fontFamily: FONTS.body, fontSize: '0.83rem', color: '#444', fontWeight: 600, flex: 1, minWidth: '120px' },
  extraFieldInput:  { fontFamily: FONTS.body, fontSize: '0.88rem', padding: '0.4rem 0.55rem', border: '1px solid #b0cfe8', borderRadius: '6px', color: '#222', background: '#fff', outline: 'none' },
  extraFieldTextarea: { fontFamily: FONTS.body, fontSize: '0.88rem', padding: '0.4rem 0.55rem', border: '1px solid #b0cfe8', borderRadius: '6px', color: '#222', background: '#fff', outline: 'none', resize: 'vertical' },
  detailsFieldBlock:  { padding: '0.45rem 0.85rem 0.6rem', background: '#f5faff', borderTop: '1px solid #d8ecf8' },
  preferredTimeBlock: { padding: '0.45rem 0.85rem 0', background: '#f5faff', borderTop: '1px solid #d8ecf8' },
  preferredTimeLabel: { display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: FONTS.body, fontSize: '0.83rem', color: '#444', fontWeight: 600 },
  preferredTimeInput: { fontFamily: FONTS.body, fontSize: '0.88rem', padding: '0.3rem 0.5rem', border: '1px solid #b0cfe8', borderRadius: '6px', outline: 'none', background: '#fff' },
  runningTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f7ff', border: '1px solid #b8d8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '1rem' },
  runningTotalLabel: { fontFamily: FONTS.header, fontSize: '0.95rem', fontWeight: 600, color: '#1a5f8a' },
  runningTotalValue: { fontFamily: FONTS.body, fontSize: '1.05rem', fontWeight: 700, color: COLORS.blue },
  runningTotalNote:  { fontFamily: FONTS.body, fontSize: '0.78rem', fontWeight: 400, color: '#888' },
  footer:     { marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' },
  primaryBtn: { fontFamily: FONTS.body, fontSize: '1rem', fontWeight: 700, padding: '0.7rem 2rem', background: COLORS.blue, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};

const sg = {
  wrap:      { padding: '0.5rem 0.85rem 0.6rem', background: '#f5faff', borderTop: '1px solid #d8ecf8' },
  scroll:    { overflowX: 'auto' },
  table:     { borderCollapse: 'collapse', minWidth: '100%' },
  thAll:     { width: '34px' },
  thLabel:   { minWidth: '76px' },
  thDate:    { textAlign: 'center', padding: '0 5px 4px', minWidth: '44px' },
  dayLbl:    { display: 'block', fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue, fontWeight: 600, lineHeight: 1.2 },
  mdLbl:     { display: 'block', fontFamily: FONTS.body, fontSize: '0.67rem', color: '#999', lineHeight: 1.2 },
  tdAll:     { paddingTop: '4px', paddingBottom: '8px', paddingRight: '4px' },
  tdLbl:     { fontFamily: FONTS.body, fontSize: '0.82rem', color: '#333', fontWeight: 600, paddingRight: '8px', whiteSpace: 'nowrap', paddingBottom: '4px' },
  tdChk:     { textAlign: 'center', padding: '6px 2px' },
  // Enlarged from 15px so day/shift selection is tappable on a phone (MR-2/MR-7) —
  // 22px plus the td's own padding brings each cell close to the ~44px touch-target guideline.
  chk:       { width: '22px', height: '22px', cursor: 'pointer', accentColor: COLORS.blue },
  lblInput:  { fontFamily: FONTS.body, fontSize: '0.82rem', fontWeight: 600, color: '#333', border: 'none', background: 'transparent', outline: 'none', width: '72px', padding: 0 },
  lblText:   { fontFamily: FONTS.body, fontSize: '0.82rem', fontWeight: 600, color: '#333' },
  addRowBtn: { marginTop: '0.35rem', background: 'none', border: 'none', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.78rem', cursor: 'pointer', padding: '0.1rem 0' },
};
