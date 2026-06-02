// ═══════════════════════════════════════════
//  POLYGON DRAW — 頂点を1つずつ確定するカスタム描画
// ═══════════════════════════════════════════

const PolygonDraw = (() => {
  let active = false;
  /** @type {L.LatLng[]} */
  let confirmed = [];
  let draftMarker = null;
  /** @type {L.LatLng|null} */
  let draftLatLng = null;
  let previewLine = null;
  let previewFill = null;
  /** @type {L.Marker[]} */
  let vertexMarkers = [];

  const confirmedIcon = L.divIcon({
    className: 'vertex-marker vertex-confirmed',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const draftIcon = L.divIcon({
    className: 'vertex-marker vertex-draft',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  function isActive() {
    return active;
  }

  function setControlsVisible(visible) {
    const el = document.getElementById('draw-controls');
    if (el) el.hidden = !visible;
    const clearBtn = document.getElementById('btn-clear-draw');
    if (clearBtn) clearBtn.style.display = visible ? 'none' : '';
  }

  function updateControls() {
    const hasDraft = !!draftLatLng;
    const n = confirmed.length;

    const btnConfirm = document.getElementById('btn-draw-confirm');
    const btnBack = document.getElementById('btn-draw-back');
    const btnComplete = document.getElementById('btn-draw-complete');
    const btnReset = document.getElementById('btn-draw-reset');

    if (btnConfirm) btnConfirm.disabled = !active || !hasDraft;
    if (btnBack) btnBack.disabled = !active || (!hasDraft && n === 0);
    if (btnComplete) btnComplete.disabled = !active || n < 3 || hasDraft;
    if (btnReset) btnReset.disabled = !active || (n === 0 && !hasDraft);
  }

  function clearPreviewLayers() {
    if (previewLine) {
      map.removeLayer(previewLine);
      previewLine = null;
    }
    if (previewFill) {
      map.removeLayer(previewFill);
      previewFill = null;
    }
  }

  function clearVertexMarkers() {
    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
  }

  function removeDraft() {
    if (draftMarker) {
      map.removeLayer(draftMarker);
      draftMarker = null;
    }
    draftLatLng = null;
  }

  function renderConfirmedMarkers() {
    clearVertexMarkers();
    confirmed.forEach((ll, i) => {
      const m = L.marker(ll, {
        draggable: false,
        icon: confirmedIcon,
        interactive: false,
        title: `頂点 ${i + 1}`,
      }).addTo(map);
      vertexMarkers.push(m);
    });
  }

  function updatePreview() {
    clearPreviewLayers();
    const pts = [...confirmed];
    if (draftLatLng) pts.push(draftLatLng);

    if (pts.length >= 2) {
      previewLine = L.polyline(pts, {
        color: CONFIG.DRAW_COLOR,
        weight: 2,
        dashArray: draftLatLng ? '6 6' : null,
        opacity: 0.9,
      }).addTo(map);
    }

    if (pts.length >= 3 && !draftLatLng) {
      previewFill = L.polygon(pts, {
        color: CONFIG.DRAW_COLOR,
        weight: 2,
        fillOpacity: 0.12,
        opacity: 0.85,
      }).addTo(map);
      if (previewLine) {
        map.removeLayer(previewLine);
        previewLine = null;
      }
    } else if (pts.length >= 3 && draftLatLng) {
      const closed = [...confirmed, draftLatLng, confirmed[0]];
      previewFill = L.polygon(closed, {
        color: CONFIG.DRAW_COLOR,
        weight: 1,
        fillOpacity: 0.06,
        opacity: 0.35,
        dashArray: '4 8',
      }).addTo(map);
    }
  }

  function onMapClick(e) {
    if (!active) return;
    setDraft(e.latlng);
    const n = confirmed.length;
    if (n === 0) {
      showDrawToast('1点目を配置しました。位置を調整して「確定」を押してください');
    } else {
      showDrawToast(`${n + 1}点目を配置しました。位置を調整して「確定」を押してください`);
    }
    updateControls();
  }

  function onDraftDrag() {
    if (!draftMarker) return;
    draftLatLng = draftMarker.getLatLng();
    updatePreview();
  }

  function setDraft(latlng) {
    draftLatLng = L.latLng(latlng.lat, latlng.lng);
    if (!draftMarker) {
      draftMarker = L.marker(draftLatLng, {
        draggable: true,
        icon: draftIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      draftMarker.on('drag', onDraftDrag);
      draftMarker.on('dragend', onDraftDrag);
      draftMarker.on('click', L.DomEvent.stopPropagation);
    } else {
      draftMarker.setLatLng(draftLatLng);
    }
    updatePreview();
    updateControls();
  }

  function start() {
    if (active) return;
    if (typeof hideWizard === 'function') hideWizard();

    active = true;
    confirmed = [];
    removeDraft();
    clearVertexMarkers();
    clearPreviewLayers();

    drawnItems.clearLayers();
    currentPolygon = null;
    currentAreaData = null;
    resetStats();

    map.on('click', onMapClick);
    map.getContainer().classList.add('polygon-draw-active');

    setControlsVisible(true);
    updateControls();
    setDrawStep('drawing');
    setSheet('half');
    switchTab('draw');
    showDrawToast('地図をタップして1点目を置いてください');
  }

  function stop() {
    if (!active) return;
    active = false;
    map.off('click', onMapClick);
    map.getContainer().classList.remove('polygon-draw-active');
    removeDraft();
    clearVertexMarkers();
    clearPreviewLayers();
    setControlsVisible(false);
    updateControls();
  }

  function confirmVertex() {
    if (!active || !draftLatLng) return;

    confirmed.push(L.latLng(draftLatLng.lat, draftLatLng.lng));
    removeDraft();
    renderConfirmedMarkers();
    updatePreview();
    updateControls();

    const n = confirmed.length;
    if (n < 3) {
      showDrawToast(`${n}点目を確定しました。あと${3 - n}点以上で「完了」できます`);
    } else {
      showDrawToast(`${n}点目を確定しました。「完了」で圃場を閉じられます`);
    }
  }

  function goBack() {
    if (!active) return;

    if (draftLatLng) {
      removeDraft();
      updatePreview();
      updateControls();
      showDrawToast('配置中の頂点を取り消しました');
      return;
    }

    if (confirmed.length === 0) return;
    confirmed.pop();
    renderConfirmedMarkers();
    updatePreview();
    updateControls();
    showDrawToast('1つ前の確定頂点に戻しました');
  }

  function complete() {
    if (!active) return;

    if (draftLatLng) {
      showDrawToast('配置中の頂点を「確定」するか「戻る」で取り消してください', 'amber');
      return;
    }

    if (confirmed.length < 3) {
      showDrawToast('完了には頂点を3つ以上確定してください', 'amber');
      return;
    }

    const latlngs = confirmed.map(ll => [ll.lat, ll.lng]);
    const poly = L.polygon(latlngs, {
      color: CONFIG.DRAW_COLOR,
      weight: 2,
      fillOpacity: 0.15,
    });

    stop();
    drawnItems.clearLayers();
    drawnItems.addLayer(poly);
    currentPolygon = poly;

    showDrawToast('圃場の形を確定しました', 'green');
    onDrawPolygonComplete(poly);
  }

  function reset() {
    if (!active) return;
    confirmed = [];
    removeDraft();
    clearVertexMarkers();
    clearPreviewLayers();
    updateControls();
    setDrawStep('drawing');
    showDrawToast('リセットしました。地図をタップして描き直してください');
  }

  function cancel() {
    stop();
    setDrawStep('idle');
  }

  return {
    isActive,
    start,
    stop,
    confirmVertex,
    goBack,
    complete,
    reset,
    cancel,
  };
})();

function startPolygonDraw() {
  PolygonDraw.start();
}

function polygonDrawConfirm() {
  PolygonDraw.confirmVertex();
}

function polygonDrawBack() {
  PolygonDraw.goBack();
}

function polygonDrawComplete() {
  PolygonDraw.complete();
}

function polygonDrawReset() {
  PolygonDraw.reset();
}
