/* =========================================================
   SIDODADI LAND GIS
   MAIN JAVASCRIPT
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let map;

let parcelLayer = null;

let allFeatures = [];

let filteredFeatures = [];

let drawnItems;

let userLocationMarker = null;

let currentBasemap = null;

let toastTimer = null;


/* =========================================================
   DOM HELPER
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   INITIAL MAP
========================================================= */

map = L.map("map", {

    center: [-5.428, 105.255],

    zoom: 13,

    zoomControl: false,

    preferCanvas: true

});


/* =========================================================
   BASEMAP
========================================================= */

const basemaps = {

    osm: L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 20,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ),

    satellite: L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 20,

            attribution:
                "Tiles &copy; Esri"
        }
    ),

    topo: L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 17,

            attribution:
                '&copy; OpenTopoMap'
        }
    ),

    dark: L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
            maxZoom: 20,

            attribution:
                '&copy; CARTO'
        }
    )

};


currentBasemap = basemaps.osm;

currentBasemap.addTo(map);

/* =========================================================
   LAYER BATAS DESA SIDODADI & JALAN
   ========================================================= */


/* =========================================================
   BATAS DESA SIDODADI
   ========================================================= */

let batasDesaLayer = null;

async function loadBatasDesa() {

    try {

        // ✅ DIPERBAIKI: nama file tanpa spasi
        const response = await fetch(
            "data/batas_desa_sidodadi.geojson"
        );

        if (!response.ok) {

            throw new Error(
                "File batas_desa_sidodadi.geojson tidak ditemukan."
            );

        }

        const data = await response.json();

        batasDesaLayer = L.geoJSON(
            data,
            {

                style: {

                    color: "#dc2626",

                    weight: 4,

                    opacity: 1,

                    fill: false

                },

                onEachFeature: function(
                    feature,
                    layer
                ) {

                    layer.bindTooltip(
                        "Batas Desa Sidodadi",
                        {
                            sticky: true,

                            direction: "center",

                            className:
                                "boundary-tooltip"
                        }
                    );

                }

            }
        );

        batasDesaLayer.addTo(map);

        console.log(
            "Batas Desa Sidodadi berhasil dimuat."
        );

    }

    catch(error) {

        console.error(
            "Gagal memuat batas desa:",
            error
        );

    }

}



/* =========================================================
   LOAD LAYER TAMBAHAN
   ========================================================= */

loadBatasDesa();

/* =========================================================
   ZOOM CONTROL
========================================================= */

L.control.zoom({

    position: "topright"

}).addTo(map);


/* =========================================================
   DRAWING
========================================================= */

drawnItems = new L.FeatureGroup();

map.addLayer(drawnItems);


const drawControl = new L.Control.Draw({

    position: "topright",

    draw: {

        polygon: {

            allowIntersection: false,

            showArea: true,

            shapeOptions: {

                color: "#f59e0b",

                weight: 3,

                fillOpacity: .2

            }

        },

        polyline: {

            shapeOptions: {

                color: "#f59e0b",

                weight: 4

            }

        },

        rectangle: {

            shapeOptions: {

                color: "#f59e0b",

                weight: 3,

                fillOpacity: .2

            }

        },

        circle: false,

        circlemarker: false,

        marker: true

    },

    edit: {

        featureGroup: drawnItems,

        remove: true

    }

});


map.addControl(drawControl);


/* =========================================================
   DRAW EVENT
========================================================= */

map.on(
    L.Draw.Event.CREATED,
    function(event) {

        const layer = event.layer;

        drawnItems.addLayer(layer);

        try {

            const geojson = layer.toGeoJSON();

            const type =
                geojson.geometry.type;

            if (
                type === "Polygon" ||
                type === "MultiPolygon"
            ) {

                const area =
                    turf.area(geojson);

                const formatted =
                    formatArea(area);

                layer.bindPopup(
                    `
                    <div class="parcel-popup">
                        <div class="parcel-popup-title">
                            Hasil Pengukuran
                        </div>

                        <div class="popup-row">
                            <span class="popup-key">
                                Luas
                            </span>

                            <span class="popup-value">
                                ${escapeHTML(formatted)}
                            </span>
                        </div>
                    </div>
                    `
                );

                notify(
                    `Luas pengukuran: ${formatted}`
                );

            }

            else if (
                type === "LineString"
            ) {

                const length =
                    turf.length(
                        geojson,
                        {
                            units: "kilometers"
                        }
                    );

                let text;

                if (length >= 1) {

                    text =
                        `${length.toLocaleString(
                            "id-ID",
                            {
                                maximumFractionDigits: 3
                            }
                        )} km`;

                }

                else {

                    text =
                        `${(
                            length * 1000
                        ).toLocaleString(
                            "id-ID",
                            {
                                maximumFractionDigits: 2
                            }
                        )} m`;

                }

                layer.bindPopup(
                    `
                    <div class="parcel-popup">
                        <div class="parcel-popup-title">
                            Hasil Pengukuran
                        </div>

                        <div class="popup-row">
                            <span class="popup-key">
                                Panjang
                            </span>

                            <span class="popup-value">
                                ${escapeHTML(text)}
                            </span>
                        </div>
                    </div>
                    `
                );

                notify(
                    `Panjang pengukuran: ${text}`
                );

            }

        }

        catch(error) {

            console.error(error);

            notify(
                "Objek berhasil digambar."
            );

        }

    }
);


/* =========================================================
   CLEAR MEASURE
========================================================= */

$("clearMeasureBtn").addEventListener(
    "click",
    function() {

        drawnItems.clearLayers();

        notify(
            "Hasil pengukuran telah dihapus."
        );

    }
);


/* =========================================================
   GEOJSON LOADER
========================================================= */

async function loadGeoJSON() {

    try {

        notify(
            "Memuat data bidang tanah..."
        );

        // ✅ DIPERBAIKI: nama file tanpa spasi
        const response =
            await fetch(
                "data/bidang_tanah.geojson"
            );

        if (!response.ok) {

            throw new Error(
                "File bidang_tanah.geojson tidak ditemukan."
            );

        }

        const data =
            await response.json();

        if (
            data.type !==
            "FeatureCollection"
        ) {

            throw new Error(
                "GeoJSON harus berupa FeatureCollection."
            );

        }

        allFeatures =
            data.features.filter(
                feature =>
                    feature &&
                    feature.geometry
            );

        filteredFeatures =
            [...allFeatures];


        createParcelLayer(
            allFeatures
        );


        createDynamicFilters();


        updateDashboard(
            allFeatures
        );


        renderTable(
            allFeatures
        );


        notify(
            `${allFeatures.length} bidang berhasil dimuat.`
        );

    }

    catch(error) {

        console.error(error);

        allFeatures = [];

        filteredFeatures = [];

        updateDashboard([]);

        renderTable([]);

        notify(
            "GeoJSON belum ditemukan. Pastikan file berada di folder data."
        );

    }

}



/* =========================================================
   CREATE PARCEL LAYER
========================================================= */

function createParcelLayer(features) {

    if (parcelLayer) {

        map.removeLayer(
            parcelLayer
        );

    }


    parcelLayer =
        L.geoJSON(
            {
                type: "FeatureCollection",

                features: features
            },
            {

                style:
                    parcelStyle,

                onEachFeature:
                    parcelEvents

            }
        );


    parcelLayer.addTo(map);


    if (
        features.length > 0
    ) {

        const bounds =
            parcelLayer.getBounds();

        if (bounds.isValid()) {

            map.fitBounds(
                bounds,
                {
                    padding: [30, 30],

                    maxZoom: 18
                }
            );

        }

    }

}


/* =========================================================
   PARCEL STYLE
========================================================= */

function parcelStyle() {

    return {

        color: "#15803d",

        weight: 1.2,

        opacity: 1,

        fillColor: "#22c55e",

        fillOpacity: .32

    };

}


/* =========================================================
   HIGHLIGHT
========================================================= */

function highlightFeature(event) {

    const layer =
        event.target;

    layer.setStyle({

        weight: 3,

        color: "#0284c7",

        fillColor: "#38bdf8",

        fillOpacity: .55

    });

    layer.bringToFront();

}


function resetHighlight(event) {

    if (parcelLayer) {

        parcelLayer.resetStyle(
            event.target
        );

    }

}


/* =========================================================
   PARCEL EVENTS
========================================================= */

function parcelEvents(
    feature,
    layer
) {

    layer.on({

        mouseover:
            highlightFeature,

        mouseout:
            resetHighlight,

        click:
            function() {

                showFeaturePopup(
                    feature,
                    layer
                );

            }

    });

    layer.bindTooltip(
        getFeatureTitle(
            feature
        ),
        {

            sticky: true,

            direction: "top",

            className:
                "parcel-tooltip"

        }
    );

}


/* =========================================================
   FEATURE TITLE
========================================================= */

function getFeatureTitle(
    feature
) {

    const props =
        getProperties(feature);

    const keys =
        Object.keys(props);

    const preferred = [

        "nama",

        "NAMA",

        "nama_bidang",

        "NAMA_BIDANG",

        "id",

        "ID",

        "nib",

        "NIB",

        "nomor",

        "NO",

        "no"

    ];

    for (
        const key of preferred
    ) {

        if (
            props[key] !== undefined &&
            props[key] !== null &&
            String(props[key]).trim() !== ""
        ) {

            return String(
                props[key]
            );

        }

    }


    if (keys.length) {

        return String(
            props[keys[0]]
        );

    }


    return "Bidang Tanah";

}


/* =========================================================
   POPUP
========================================================= */

function showFeaturePopup(
    feature,
    layer
) {

    const props =
        getProperties(feature);

    const keys =
        Object.keys(props);

    let html = `
        <div class="parcel-popup">

            <div class="parcel-popup-title">
                <i class="fa-solid fa-map-pin"></i>
                Informasi Bidang
            </div>
    `;


    if (!keys.length) {

        html += `
            <div class="popup-row">
                <span class="popup-key">
                    Informasi
                </span>

                <span class="popup-value">
                    Tidak tersedia
                </span>
            </div>
        `;

    }


    keys.forEach(
        key => {

            let value =
                props[key];

            value =
                formatValue(value);


            html += `
                <div class="popup-row">

                    <span class="popup-key">
                        ${escapeHTML(
                            key
                        )}
                    </span>

                    <span class="popup-value">
                        ${escapeHTML(
                            value
                        )}
                    </span>

                </div>
            `;

        }
    );


    const area =
        getAreaM2(feature);


    if (
        area !== null
    ) {

        html += `
            <div class="popup-row">

                <span class="popup-key">
                    Luas
                </span>

                <span class="popup-value">
                    ${formatArea(
                        area
                    )}
                </span>

            </div>
        `;

    }


    html += `
        </div>
    `;


    layer.bindPopup(
        html,
        {
            maxWidth: 400
        }
    ).openPopup();

}


/* =========================================================
   GET PROPERTIES
========================================================= */

function getProperties(
    feature
) {

    if (
        feature &&
        feature.properties
    ) {

        return feature.properties;

    }

    return {};

}


/* =========================================================
   DYNAMIC FILTER
========================================================= */

function createDynamicFilters() {

    const container =
        $("dynamicFilters");

    container.innerHTML = "";


    if (
        !allFeatures.length
    ) {

        container.innerHTML = `
            <div class="filter-loading">
                Tidak ada data.
            </div>
        `;

        return;

    }


    const fieldSet =
        new Set();


    allFeatures.forEach(
        feature => {

            Object.keys(
                getProperties(
                    feature
                )
            ).forEach(
                key =>
                    fieldSet.add(key)
            );

        }
    );


    const fields =
        [...fieldSet];


    if (!fields.length) {

        container.innerHTML = `
            <div class="filter-loading">
                GeoJSON tidak memiliki atribut.
            </div>
        `;

        return;

    }


    /*
       Agar panel tidak terlalu panjang,
       maksimal 12 field dibuat sebagai
       dropdown.
    */

    fields
        .slice(0, 12)
        .forEach(
            field => {

                const wrapper =
                    document.createElement(
                        "div"
                    );

                wrapper.className =
                    "dynamic-filter";


                const label =
                    document.createElement(
                        "label"
                    );

                label.textContent =
                    beautifyFieldName(
                        field
                    );


                const select =
                    document.createElement(
                        "select"
                    );

                select.dataset.field =
                    field;


                const defaultOption =
                    document.createElement(
                        "option"
                    );

                defaultOption.value = "";

                defaultOption.textContent =
                    "Semua";

                select.appendChild(
                    defaultOption
                );


                const values =
                    getUniqueValues(
                        field
                    );


                values
                    .slice(0, 200)
                    .forEach(
                        value => {

                            const option =
                                document.createElement(
                                    "option"
                                );

                            option.value =
                                String(value);

                            option.textContent =
                                formatValue(
                                    value
                                );

                            select.appendChild(
                                option
                            );

                        }
                    );


                wrapper.appendChild(
                    label
                );

                wrapper.appendChild(
                    select
                );

                container.appendChild(
                    wrapper
                );

            }
        );


    $("totalAttributes")
        .textContent =
        fields.length;

}


/* =========================================================
   UNIQUE VALUES
========================================================= */

function getUniqueValues(
    field
) {

    const values =
        new Set();


    allFeatures.forEach(
        feature => {

            const props =
                getProperties(
                    feature
                );

            const value =
                props[field];


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {

                values.add(
                    value
                );

            }

        }
    );


    return [...values].sort(
        (a, b) =>
            String(a).localeCompare(
                String(b),
                "id"
            )
    );

}


/* =========================================================
   APPLY FILTER
========================================================= */

function applyFilters() {

    const search =
        $("searchInput")
            .value
            .trim()
            .toLowerCase();


    const selects =
        document.querySelectorAll(
            ".dynamic-filter select"
        );


    const selectedFilters = {};


    selects.forEach(
        select => {

            if (
                select.value !== ""
            ) {

                selectedFilters[
                    select.dataset.field
                ] =
                    select.value;

            }

        }
    );


    filteredFeatures =
        allFeatures.filter(
            (feature, index) => {

                const props =
                    getProperties(
                        feature
                    );


                /*
                   FILTER DROPDOWN
                */

                const matchesFilters =
                    Object.entries(
                        selectedFilters
                    ).every(
                        ([field, value]) =>
                            String(
                                props[field]
                            ) === value
                    );


                if (
                    !matchesFilters
                ) {

                    return false;

                }


                /*
                   SEARCH SEMUA ATRIBUT
                */

                if (
                    search
                ) {

                    const values = [

                        getFeatureTitle(
                            feature
                        ),

                        ...Object.keys(
                            props
                        ),

                        ...Object.values(
                            props
                        ).map(
                            formatValue
                        )

                    ];


                    const found =
                        values.some(
                            value =>
                                String(
                                    value ?? ""
                                )
                                .toLowerCase()
                                .includes(
                                    search
                                )
                        );


                    if (!found) {

                        return false;

                    }

                }


                return true;

            }
        );


    /*
       GANTI LAYER
    */

    createParcelLayer(
        filteredFeatures
    );


    updateDashboard(
        filteredFeatures
    );


    renderTable(
        filteredFeatures
    );


    notify(
        `${filteredFeatures.length} data ditemukan.`
    );

}


/* =========================================================
   SEARCH LIVE
========================================================= */

$("searchInput")
    .addEventListener(
        "input",
        debounce(
            function() {

                applyFilters();

            },
            350
        )
    );


/* =========================================================
   APPLY BUTTON
========================================================= */

$("applyFilters")
    .addEventListener(
        "click",
        applyFilters
    );


/* =========================================================
   RESET FILTER
========================================================= */

function resetFilters() {

    $("searchInput")
        .value = "";


    document
        .querySelectorAll(
            ".dynamic-filter select"
        )
        .forEach(
            select => {

                select.value = "";

            }
        );


    filteredFeatures =
        [...allFeatures];


    createParcelLayer(
        allFeatures
    );


    updateDashboard(
        allFeatures
    );


    renderTable(
        allFeatures
    );


    notify(
        "Semua filter telah direset."
    );

}


$("resetFilters")
    .addEventListener(
        "click",
        resetFilters
    );


$("clearFilters")
    .addEventListener(
        "click",
        resetFilters
    );


/* =========================================================
   CLEAR SEARCH
========================================================= */

$("clearSearch")
    .addEventListener(
        "click",
        function() {

            $("searchInput")
                .value = "";

            applyFilters();

            $("searchInput")
                .focus();

        }
    );


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard(
    features
) {

    const total =
        features.length;


    const totalArea =
        features.reduce(
            (sum, feature) => {

                const area =
                    getAreaM2(
                        feature
                    );

                return sum +
                    (
                        area || 0
                    );

            },
            0
        );


    $("totalFields")
        .textContent =
        total.toLocaleString(
            "id-ID"
        );


    $("totalArea")
        .textContent =
        formatArea(
            totalArea
        );


    $("featureCount")
        .textContent =
        `${total.toLocaleString(
            "id-ID"
        )} bidang`;


    $("tableSummary")
        .textContent =
        `${total.toLocaleString(
            "id-ID"
        )} data`;


    const fields =
        new Set();


    allFeatures.forEach(
        feature => {

            Object.keys(
                getProperties(
                    feature
                )
            ).forEach(
                key =>
                    fields.add(key)
            );

        }
    );


    $("totalAttributes")
        .textContent =
        fields.size;

}


/* =========================================================
   AREA
========================================================= */

function getAreaM2(
    feature
) {

    const props =
        getProperties(
            feature
        );


    /*
       Coba mencari atribut
       luas terlebih dahulu.
    */

    const possibleFields = [

        "luas",

        "LUAS",

        "luas_m2",

        "LUAS_M2",

        "area",

        "AREA",

        "area_m2",

        "AREA_M2"

    ];


    for (
        const field of possibleFields
    ) {

        if (
            props[field] !==
            undefined &&
            props[field] !== null
        ) {

            const number =
                parseFloat(
                    String(
                        props[field]
                    )
                    .replace(
                        /,/g,
                        ""
                    )
                    .replace(
                        /[^0-9.-]/g,
                        ""
                    )
                );


            if (
                !Number.isNaN(
                    number
                )
            ) {

                return number;

            }

        }

    }


    /*
       Jika atribut luas tidak ada,
       hitung dari geometry.
    */

    try {

        if (
            feature.geometry &&
            (
                feature.geometry.type ===
                "Polygon" ||

                feature.geometry.type ===
                "MultiPolygon"
            )
        ) {

            return turf.area(
                feature
            );

        }

    }

    catch(error) {

        console.warn(
            "Gagal menghitung luas:",
            error
        );

    }


    return null;

}


/* =========================================================
   FORMAT AREA
========================================================= */

function formatArea(
    area
) {

    if (
        area === null ||
        area === undefined ||
        Number.isNaN(area)
    ) {

        return "0 m²";

    }


    if (
        area >= 10000
    ) {

        const hectare =
            area / 10000;


        return `${area.toLocaleString(
            "id-ID",
            {
                maximumFractionDigits: 2
            }
        )} m² (${hectare.toLocaleString(
            "id-ID",
            {
                maximumFractionDigits: 2
            }
        )} ha)`;

    }


    return `${area.toLocaleString(
        "id-ID",
        {
            maximumFractionDigits: 2
        }
    )} m²`;

}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable(
    features
) {

    const head =
        $("fieldTableHead");

    const body =
        $("fieldTable");


    head.innerHTML = "";

    body.innerHTML = "";


    if (
        !features.length
    ) {

        body.innerHTML = `
            <tr>

                <td
                    colspan="10"
                    class="empty-cell"
                >

                    <i class="fa-solid fa-filter-circle-xmark"></i>

                    <span>
                        Tidak ada data yang sesuai.
                    </span>

                </td>

            </tr>
        `;

        return;

    }


    /*
       Gabungkan seluruh field.
    */

    const fieldSet =
        new Set();


    features.forEach(
        feature => {

            Object.keys(
                getProperties(
                    feature
                )
            ).forEach(
                key =>
                    fieldSet.add(key)
            );

        }
    );


    const fields =
        [...fieldSet];


    /*
       HEADER
    */

    const headerRow =
        document.createElement(
            "tr"
        );


    const noTh =
        document.createElement(
            "th"
        );

    noTh.textContent =
        "No";

    headerRow.appendChild(
        noTh
    );


    fields
    .slice(0, 15)
    .forEach(
        field => {

            const th =
                document.createElement(
                    "th"
                );

            th.textContent =
                beautifyFieldName(
                    field
                );

            headerRow.appendChild(
                th
            );

        }
    );


    const areaTh =
        document.createElement(
            "th"
        );

    areaTh.textContent =
        "Luas";

    headerRow.appendChild(
        areaTh
    );


    head.appendChild(
        headerRow
    );


    /*
       BODY
    */

    features.forEach(
        (feature, index) => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.addEventListener(
                "click",
                function() {

                    zoomToFeature(
                        feature
                    );

                }
            );


            const noTd =
                document.createElement(
                    "td"
                );

            noTd.textContent =
                index + 1;


            tr.appendChild(
                noTd
            );


            fields
                .slice(0, 15)
                .forEach(
                    field => {

                        const td =
                            document.createElement(
                                "td"
                            );

                        const props =
                            getProperties(
                                feature
                            );


                        td.textContent =
                            formatValue(
                                props[field]
                            );


                        tr.appendChild(
                            td
                        );

                    }
                );


            const areaTd =
                document.createElement(
                    "td"
                );


            const area =
                getAreaM2(
                    feature
                );


            areaTd.textContent =
                area !== null
                    ? formatArea(area)
                    : "-";


            tr.appendChild(
                areaTd
            );


            body.appendChild(
                tr
            );

        }
    );

}


/* =========================================================
   ZOOM TO FEATURE
========================================================= */

function zoomToFeature(
    feature
) {

    const layer =
        L.geoJSON(
            feature
        );


    const bounds =
        layer.getBounds();


    if (
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding: [50, 50],

                maxZoom: 19
            }
        );

    }


    /*
       Cari layer asli dan buka popup.
    */

    if (
        parcelLayer
    ) {

        parcelLayer.eachLayer(
            layer => {

                if (
                    layer.feature ===
                    feature
                ) {

                    showFeaturePopup(
                        feature,
                        layer
                    );

                }

            }
        );

    }

}


/* =========================================================
   BASEMAP SWITCH
========================================================= */

$("basemapSelect")
    .addEventListener(
        "change",
        function(event) {

            const selected =
                event.target.value;


            if (
                currentBasemap
            ) {

                map.removeLayer(
                    currentBasemap
                );

            }


            currentBasemap =
                basemaps[selected];


            currentBasemap.addTo(
                map
            );


            notify(
                `Basemap diganti ke ${event.target.selectedOptions[0].text}.`
            );

        }
    );


/* =========================================================
   LAYER TOGGLE
========================================================= */

$("parcelToggle")
    .addEventListener(
        "change",
        function() {

            const checked =
                this.checked;


            if (
                checked
            ) {

                if (
                    parcelLayer
                ) {

                    parcelLayer.addTo(
                        map
                    );

                }

                $("layerStatus")
                    .textContent =
                    "Aktif";


                notify(
                    "Layer bidang tanah diaktifkan."
                );

            }

            else {

                if (
                    parcelLayer
                ) {

                    map.removeLayer(
                        parcelLayer
                    );

                }

                $("layerStatus")
                    .textContent =
                    "Nonaktif";


                notify(
                    "Layer bidang tanah dimatikan."
                );

            }

        }
    );


/* =========================================================
   FIT ALL
========================================================= */

$("fitBtn")
    .addEventListener(
        "click",
        function() {

            zoomToAll();

        }
    );


function zoomToAll() {

    if (
        parcelLayer
    ) {

        const bounds =
            parcelLayer.getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding: [30, 30],

                    maxZoom: 18
                }
            );

            return;

        }

    }


    if (
        allFeatures.length
    ) {

        const layer =
            L.geoJSON(
                {
                    type:
                        "FeatureCollection",

                    features:
                        allFeatures
                }
            );


        const bounds =
            layer.getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding: [30, 30]
                }
            );

        }

    }

}


/* =========================================================
   HOME
========================================================= */

$("homeBtn")
    .addEventListener(
        "click",
        function() {

            map.setView(
                [-5.428, 105.255],
                13
            );

            notify(
                "Tampilan awal dikembalikan."
            );

        }
    );


/* =========================================================
   LOCATE USER
========================================================= */

$("locateBtn")
    .addEventListener(
        "click",
        function() {

            if (
                !navigator.geolocation
            ) {

                notify(
                    "Browser tidak mendukung lokasi."
                );

                return;

            }


            notify(
                "Mencari lokasi Anda..."
            );


            navigator.geolocation.getCurrentPosition(

                function(position) {

                    const lat =
                        position.coords.latitude;

                    const lng =
                        position.coords.longitude;


                    map.setView(
                        [lat, lng],
                        17
                    );


                    if (
                        userLocationMarker
                    ) {

                        map.removeLayer(
                            userLocationMarker
                        );

                    }


                    userLocationMarker =
                        L.marker(
                            [lat, lng]
                        )
                        .addTo(map)
                        .bindPopup(
                            `
                            <strong>Lokasi Saya</strong>
                            <br>
                            Latitude:
                            ${lat.toFixed(6)}
                            <br>
                            Longitude:
                            ${lng.toFixed(6)}
                            `
                        )
                        .openPopup();


                    notify(
                        "Lokasi berhasil ditemukan."
                    );

                },

                function(error) {

                    let message =
                        "Lokasi tidak dapat ditemukan.";


                    if (
                        error.code === 1
                    ) {

                        message =
                            "Akses lokasi ditolak.";

                    }


                    notify(
                        message
                    );

                },

                {

                    enableHighAccuracy:
                        true,

                    timeout:
                        10000,

                    maximumAge:
                        0

                }

            );

        }
    );


/* =========================================================
   FULLSCREEN
========================================================= */

$("fullscreenBtn")
    .addEventListener(
        "click",
        function() {

            const mapElement =
                document.querySelector(
                    ".map-wrapper"
                );


            if (
                !document.fullscreenElement
            ) {

                mapElement
                    .requestFullscreen()
                    .then(
                        () => {

                            setTimeout(
                                () => {
                                    map.invalidateSize();
                                },
                                300
                            );

                        }
                    );

            }

            else {

                document.exitFullscreen();

            }

        }
    );


document.addEventListener(
    "fullscreenchange",
    function() {

        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );

    }
);


/* =========================================================
   PRINT
========================================================= */

$("printBtn")
    .addEventListener(
        "click",
        function() {

            window.print();

        }
    );


/* =========================================================
   IMPORT GEOJSON
========================================================= */

$("uploadBtn")
    .addEventListener(
        "click",
        function() {

            $("geojsonInput")
                .click();

        }
    );


$("geojsonInput")
    .addEventListener(
        "change",
        async function(event) {

            const file =
                event.target.files[0];


            if (
                !file
            ) {

                return;

            }


            try {

                const text =
                    await file.text();


                const data =
                    JSON.parse(
                        text
                    );


                let features = [];


                if (
                    data.type ===
                    "FeatureCollection"
                ) {

                    features =
                        data.features;

                }

                else if (
                    data.type ===
                    "Feature"
                ) {

                    features =
                        [data];

                }

                else {

                    throw new Error(
                        "Format GeoJSON tidak dikenali."
                    );

                }


                allFeatures =
                    features.filter(
                        feature =>
                            feature &&
                            feature.geometry
                    );


                filteredFeatures =
                    [...allFeatures];


                createParcelLayer(
                    allFeatures
                );


                createDynamicFilters();


                updateDashboard(
                    allFeatures
                );


                renderTable(
                    allFeatures
                );


                notify(
                    `${allFeatures.length} fitur berhasil diimpor.`
                );

            }

            catch(error) {

                console.error(
                    error
                );

                notify(
                    `Gagal membaca GeoJSON: ${error.message}`
                );

            }


            event.target.value = "";

        }
    );


/* =========================================================
   EXPORT GEOJSON
========================================================= */

$("exportBtn")
    .addEventListener(
        "click",
        function() {

            if (
                !allFeatures.length
            ) {

                notify(
                    "Belum ada data untuk diekspor."
                );

                return;

            }


            const data = {

                type:
                    "FeatureCollection",

                features:
                    allFeatures

            };


            downloadFile(

                JSON.stringify(
                    data,
                    null,
                    2
                ),

                "sidodadi_bidang_tanah.geojson",

                "application/geo+json"

            );


            notify(
                "GeoJSON berhasil diekspor."
            );

        }
    );


/* =========================================================
   CSV EXPORT
========================================================= */

$("tableExportBtn")
    .addEventListener(
        "click",
        exportCSV
    );


$("tableExportBtn2")
    .addEventListener(
        "click",
        exportCSV
    );


function exportCSV() {

    if (
        !filteredFeatures.length
    ) {

        notify(
            "Tidak ada data untuk diekspor."
        );

        return;

    }


    const fieldSet =
        new Set();


    filteredFeatures.forEach(
        feature => {

            Object.keys(
                getProperties(
                    feature
                )
            ).forEach(
                key =>
                    fieldSet.add(key)
            );

        }
    );


    const fields =
        [...fieldSet];


    const headers = [

        "No",

        ...fields,

        "Luas m2"

    ];


    const rows =
        filteredFeatures.map(
            (feature, index) => {

                const props =
                    getProperties(
                        feature
                    );


                return [

                    index + 1,

                    ...fields.map(
                        field =>
                            formatValue(
                                props[field]
                            )
                    ),

                    getAreaM2(
                        feature
                    ) ?? ""

                ];

            }
        );


    const csvRows = [

        headers,

        ...rows

    ].map(
        row =>
            row
                .map(
                    value =>
                        quoteCSV(
                            value
                        )
                )
                .join(",")
    );


    const csv =
        "\uFEFF" +
        csvRows.join(
            "\r\n"
        );


    downloadFile(

        csv,

        "sidodadi_data_bidang.csv",

        "text/csv;charset=utf-8"

    );


    notify(
        "CSV berhasil diekspor."
    );

}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadFile(
    content,
    filename,
    type
) {

    const blob =
        new Blob(
            [content],
            {
                type: type
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        100
    );

}


/* =========================================================
   QUOTE CSV
========================================================= */

function quoteCSV(
    value
) {

    return `"${String(
        value ?? ""
    ).replace(
        /"/g,
        '""'
    )}"`;

}


/* =========================================================
   DARK MODE
========================================================= */

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark"
    );


    const dark =
        document.body.classList.contains(
            "dark"
        );


    const icon =
        dark
            ? "fa-sun"
            : "fa-moon";


    $("themeBtn").innerHTML =
        `<i class="fa-solid ${icon}"></i>`;


    $("darkBtn").innerHTML =
        `
        <i class="fa-solid ${icon}"></i>
        <span>
            ${dark
                ? "Mode Terang"
                : "Mode Gelap"}
        </span>
        `;


    localStorage.setItem(
        "sidodadiDarkMode",
        dark
            ? "1"
            : "0"
    );


    setTimeout(
        () => {

            map.invalidateSize();

        },
        150
    );

}


$("themeBtn")
    .addEventListener(
        "click",
        toggleDarkMode
    );


$("darkBtn")
    .addEventListener(
        "click",
        toggleDarkMode
    );


/* =========================================================
   RESTORE DARK MODE
========================================================= */

if (
    localStorage.getItem(
        "sidodadiDarkMode"
    ) === "1"
) {

    document.body.classList.add(
        "dark"
    );


    $("themeBtn").innerHTML =
        `<i class="fa-solid fa-sun"></i>`;


    $("darkBtn").innerHTML =
        `
        <i class="fa-solid fa-sun"></i>
        <span>Mode Terang</span>
        `;

}


/* =========================================================
   MOBILE MENU
========================================================= */

$("menuBtn")
    .addEventListener(
        "click",
        function() {

            $("sidebar")
                .classList.add(
                    "open"
                );

        }
    );


$("closeSidebar")
    .addEventListener(
        "click",
        function() {

            $("sidebar")
                .classList.remove(
                    "open"
                );

        }
    );


document
    .querySelectorAll(
        ".nav-link"
    )
    .forEach(
        link => {

            link.addEventListener(
                "click",
                function() {

                    document
                        .querySelectorAll(
                            ".nav-link"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    this.classList.add(
                        "active"
                    );


                    $("sidebar")
                        .classList.remove(
                            "open"
                        );

                }
            );

        }
    );


/* =========================================================
   HERO MAP BUTTON
========================================================= */

$("heroMapBtn")
    .addEventListener(
        "click",
        function() {

            $("map-section")
                .scrollIntoView(
                    {
                        behavior:
                            "smooth"
                    }
                );

        }
    );


/* =========================================================
   COORDINATES
========================================================= */

map.on(
    "mousemove",
    function(event) {

        $("cursorCoords")
            .textContent =
            `Koordinat: ${
                event.latlng.lat.toFixed(6)
            }, ${
                event.latlng.lng.toFixed(6)
            }`;

    }
);


/* =========================================================
   UTILITY
========================================================= */

function formatValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    if (
        typeof value ===
        "object"
    ) {

        try {

            return JSON.stringify(
                value
            );

        }

        catch(error) {

            return String(
                value
            );

        }

    }


    return String(
        value
    );

}


/* =========================================================
   BEAUTIFY FIELD
========================================================= */

function beautifyFieldName(
    field
) {

    return String(field)

        .replace(
            /_/g,
            " "
        )

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim()

        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================================
   DEBOUNCE
========================================================= */

function debounce(
    func,
    delay
) {

    let timer;


    return function(...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    func.apply(
                        this,
                        args
                    );

                },
                delay
            );

    };

}


/* =========================================================
   TOAST
========================================================= */

function notify(
    message
) {

    const toast =
        $("toast");

    const text =
        $("toastMessage");


    text.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   YEAR
========================================================= */

$("year")
    .textContent =
    new Date()
        .getFullYear();


/* =========================================================
   START
========================================================= */

loadGeoJSON();


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    function() {

        setTimeout(
            () => {

                map.invalidateSize();

            },
            200
        );

    }
);

/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let hakMilikLayer = null;

let hakKosongLayer = null;


/* =========================================================
   STYLE HAK MILIK
========================================================= */

function hakMilikStyle() {

    return {

        color: "#3c00ff",

        weight: 1.5,

        opacity: 1,

        fillColor: "#0026ff",

        fillOpacity: 0.40

    };

}


/* =========================================================
   STYLE HAK KOSONG
========================================================= */

function hakKosongStyle() {

    return {

        color: "#c2410c",

        weight: 1.5,

        opacity: 1,

        fillColor: "#f97316",

        fillOpacity: 0.45

    };

}


/* =========================================================
   LOAD HAK MILIK
========================================================= */

async function loadHakMilik() {

    try {

        // ✅ DIPERBAIKI: nama file tanpa spasi
        const response =
            await fetch(
                "data/hak_milik.geojson"
            );

        if (!response.ok) {

            throw new Error(
                "hak_milik.geojson tidak ditemukan."
            );

        }

        const data =
            await response.json();

        hakMilikLayer =
            L.geoJSON(
                data,
                {

                    style:
                        hakMilikStyle,

                    onEachFeature:
                        function(
                            feature,
                            layer
                        ) {

                            layer.on({

                                mouseover:
                                    function(e) {

                                        e.target.setStyle({

                                            weight: 3,

                                            color: "#2b00ff",

                                            fillColor: "#2f00fe",

                                            fillOpacity: 0.65

                                        });

                                    },

                                mouseout:
                                    function(e) {

                                        hakMilikLayer.resetStyle(
                                            e.target
                                        );

                                    },

                                click:
                                    function() {

                                        showFeaturePopup(
                                            feature,
                                            layer
                                        );

                                    }

                            });

                            layer.bindTooltip(
                                getFeatureTitle(
                                    feature
                                ),
                                {
                                    sticky: true,

                                    direction: "top",

                                    className:
                                        "parcel-tooltip"
                                }
                            );

                        }

                }
            );

        hakMilikLayer.addTo(map);

        console.log(
            "Hak Milik berhasil dimuat."
        );

    }

    catch(error) {

        console.error(
            "Gagal memuat Hak Milik:",
            error
        );

    }

}


/* =========================================================
   LOAD HAK KOSONG
========================================================= */

async function loadHakKosong() {

    try {

        // ✅ DIPERBAIKI: nama file tanpa spasi
        const response =
            await fetch(
                "data/hak_kosong.geojson"
            );

        if (!response.ok) {

            throw new Error(
                "hak_kosong.geojson tidak ditemukan."
            );

        }

        const data =
            await response.json();

        hakKosongLayer =
            L.geoJSON(
                data,
                {

                    style:
                        hakKosongStyle,

                    onEachFeature:
                        function(
                            feature,
                            layer
                        ) {

                            layer.on({

                                mouseover:
                                    function(e) {

                                        e.target.setStyle({

                                            weight: 3,

                                            color: "#9a3412",

                                            fillColor: "#fdba74",

                                            fillOpacity: 0.70

                                        });

                                    },

                                mouseout:
                                    function(e) {

                                        hakKosongLayer.resetStyle(
                                            e.target
                                        );

                                    },

                                click:
                                    function() {

                                        showFeaturePopup(
                                            feature,
                                            layer
                                        );

                                    }

                            });

                            layer.bindTooltip(
                                getFeatureTitle(
                                    feature
                                ),
                                {
                                    sticky: true,

                                    direction: "top",

                                    className:
                                        "parcel-tooltip"
                                }
                            );

                        }

                }
            );

        hakKosongLayer.addTo(map);

        console.log(
            "Hak Kosong berhasil dimuat."
        );

    }

    catch(error) {

        console.error(
            "Gagal memuat Hak Kosong:",
            error
        );

    }

}


/* =========================================================
   BUAT LAYER ITEM
   TAMPIL SEPERTI BIDANG TANAH
========================================================= */

function createHakLayerControls() {

    /*
       Jangan buat dua kali
    */

    if (
        document.getElementById(
            "hakMilikLayerItem"
        )
    ) {

        return;

    }


    /*
       Cari tombol/checkbox Bidang Tanah
    */

    const parcelToggle =
        document.getElementById(
            "parcelToggle"
        );


    if (!parcelToggle) {

        console.error(
            "parcelToggle tidak ditemukan."
        );

        return;

    }


    /*
       Cari baris Bidang Tanah
    */

    let bidangItem =
        parcelToggle.closest(
            ".layer-item"
        );


    if (!bidangItem) {

        bidangItem =
            parcelToggle.parentElement;

    }


    /*
       Cari parent tempat layer
       Bidang Tanah berada
    */

    const layerParent =
        bidangItem.parentElement;


    /* =====================================================
       HAK MILIK
    ===================================================== */

    const hakMilikItem =
        document.createElement(
            "div"
        );

    hakMilikItem.id =
        "hakMilikLayerItem";


    hakMilikItem.style.cssText = `

        display:flex;

        align-items:center;

        justify-content:space-between;

        width:100%;

        min-height:42px;

        padding:0 10px;

        box-sizing:border-box;

        cursor:pointer;

    `;


    hakMilikItem.innerHTML = `

        <div
            style="
                display:flex;
                align-items:center;
                gap:10px;
                min-width:0;
            "
        >

            <span
                style="
                    width:10px;
                    height:10px;
                    min-width:10px;
                    border-radius:2px;
                    background:#22c55e;
                    display:inline-block;
                "
            ></span>

            <span
                style="
                    color:inherit;
                    font-size:12px;
                    font-weight:500;
                    white-space:nowrap;
                "
            >
                Hak Milik
            </span>

        </div>


        <label
            style="
                position:relative;
                width:32px;
                height:18px;
                display:inline-block;
                flex-shrink:0;
                cursor:pointer;
            "
        >

            <input
                type="checkbox"
                id="hakMilikToggle"
                checked
                style="
                    opacity:0;
                    width:0;
                    height:0;
                    position:absolute;
                "
            >

            <span
                id="hakMilikSlider"
                style="
                    position:absolute;
                    inset:0;
                    background:#18b77e;
                    border-radius:20px;
                    transition:.2s;
                "
            ></span>

            <span
                id="hakMilikKnob"
                style="
                    position:absolute;
                    width:14px;
                    height:14px;
                    left:15px;
                    top:2px;
                    background:white;
                    border-radius:50%;
                    transition:.2s;
                    box-shadow:0 1px 3px rgba(0,0,0,.25);
                "
            ></span>

        </label>

    `;


    /* =====================================================
       HAK KOSONG
    ===================================================== */

    const hakKosongItem =
        document.createElement(
            "div"
        );

    hakKosongItem.id =
        "hakKosongLayerItem";


    hakKosongItem.style.cssText = `

        display:flex;

        align-items:center;

        justify-content:space-between;

        width:100%;

        min-height:42px;

        padding:0 10px;

        box-sizing:border-box;

        cursor:pointer;

    `;


    hakKosongItem.innerHTML = `

        <div
            style="
                display:flex;
                align-items:center;
                gap:10px;
                min-width:0;
            "
        >

            <span
                style="
                    width:10px;
                    height:10px;
                    min-width:10px;
                    border-radius:2px;
                    background:#f97316;
                    display:inline-block;
                "
            ></span>

            <span
                style="
                    color:inherit;
                    font-size:12px;
                    font-weight:500;
                    white-space:nowrap;
                "
            >
                Hak Kosong
            </span>

        </div>


        <label
            style="
                position:relative;
                width:32px;
                height:18px;
                display:inline-block;
                flex-shrink:0;
                cursor:pointer;
            "
        >

            <input
                type="checkbox"
                id="hakKosongToggle"
                checked
                style="
                    opacity:0;
                    width:0;
                    height:0;
                    position:absolute;
                "
            >

            <span
                id="hakKosongSlider"
                style="
                    position:absolute;
                    inset:0;
                    background:#18b77e;
                    border-radius:20px;
                    transition:.2s;
                "
            ></span>

            <span
                id="hakKosongKnob"
                style="
                    position:absolute;
                    width:14px;
                    height:14px;
                    left:15px;
                    top:2px;
                    background:white;
                    border-radius:50%;
                    transition:.2s;
                    box-shadow:0 1px 3px rgba(0,0,0,.25);
                "
            ></span>

        </label>

    `;


    /*
       Masukkan tepat setelah
       Bidang Tanah
    */

    layerParent.insertBefore(
        hakMilikItem,
        bidangItem.nextSibling
    );


    layerParent.insertBefore(
        hakKosongItem,
        hakMilikItem.nextSibling
    );


    /* =====================================================
       TOGGLE HAK MILIK
    ===================================================== */

    const hakMilikToggle =
        document.getElementById(
            "hakMilikToggle"
        );

    const hakMilikSlider =
        document.getElementById(
            "hakMilikSlider"
        );

    const hakMilikKnob =
        document.getElementById(
            "hakMilikKnob"
        );


    hakMilikToggle.addEventListener(
        "change",
        function() {

            if (this.checked) {

                if (hakMilikLayer) {

                    hakMilikLayer.addTo(
                        map
                    );

                }

                hakMilikSlider.style.background =
                    "#ff002b";

                hakMilikKnob.style.left =
                    "15px";

            }

            else {

                if (hakMilikLayer) {

                    map.removeLayer(
                        hakMilikLayer
                    );

                }

                hakMilikSlider.style.background =
                    "#fb0307";

                hakMilikKnob.style.left =
                    "2px";

            }

        }
    );


    /* =====================================================
       TOGGLE HAK KOSONG
    ===================================================== */

    const hakKosongToggle =
        document.getElementById(
            "hakKosongToggle"
        );

    const hakKosongSlider =
        document.getElementById(
            "hakKosongSlider"
        );

    const hakKosongKnob =
        document.getElementById(
            "hakKosongKnob"
        );


    hakKosongToggle.addEventListener(
        "change",
        function() {

            if (this.checked) {

                if (hakKosongLayer) {

                    hakKosongLayer.addTo(
                        map
                    );

                }

                hakKosongSlider.style.background =
                    "#0059ff";

                hakKosongKnob.style.left =
                    "15px";

            }

            else {

                if (hakKosongLayer) {

                    map.removeLayer(
                        hakKosongLayer
                    );

                }

                hakKosongSlider.style.background =
                    "#006afe";

                hakKosongKnob.style.left =
                    "2px";

            }

        }
    );

}


/* =========================================================
   LOAD HAK MILIK + HAK KOSONG
========================================================= */

async function loadHakLayers() {

    await Promise.all([

        loadHakMilik(),

        loadHakKosong()

    ]);


    createHakLayerControls();

}


/* =========================================================
   JALANKAN
========================================================= */

loadHakLayers();

/* =========================================================
   LAYER JALAN SIDODADI
   ========================================================= */

let jalanLayer = null;


/* =========================================================
   STYLE JALAN
   ========================================================= */

function jalanStyle() {

    return {

        color: "#2563eb",

        weight: 4,

        opacity: 0.95,

        lineCap: "round",

        lineJoin: "round"

    };

}


/* =========================================================
   MENCARI NAMA JALAN
   ========================================================= */

function getNamaJalan(feature) {

    const props =
        feature &&
        feature.properties
            ? feature.properties
            : {};

    const preferredFields = [

        "nama_jalan",

        "NAMA_JALAN",

        "namajalan",

        "Nama_Jalan",

        "Nama Jalan",

        "nama",

        "NAMA",

        "name",

        "NAME",

        "Name",

        "jalan",

        "JALAN"

    ];


    for (
        const field of preferredFields
    ) {

        if (
            props[field] !== undefined &&
            props[field] !== null &&
            String(props[field]).trim() !== ""
        ) {

            return String(
                props[field]
            );

        }

    }


    /*
       Jika nama jalan tidak ditemukan,
       gunakan atribut pertama.
    */

    const keys =
        Object.keys(props);


    if (keys.length > 0) {

        const firstValue =
            props[keys[0]];

        if (
            firstValue !== undefined &&
            firstValue !== null &&
            String(firstValue).trim() !== ""
        ) {

            return String(
                firstValue
            );

        }

    }


    return "Jalan";
}


/* =========================================================
   POPUP JALAN
   ========================================================= */

function showJalanPopup(
    feature,
    layer
) {

    const props =
        feature &&
        feature.properties
            ? feature.properties
            : {};


    const keys =
        Object.keys(props);


    const namaJalan =
        getNamaJalan(feature);


    let html = `

        <div class="jalan-popup">

            <div
                style="
                    font-size:16px;
                    font-weight:700;
                    margin-bottom:12px;
                    color:#1d4ed8;
                "
            >

                <i
                    class="fa-solid fa-road"
                    style="margin-right:7px;"
                ></i>

                ${escapeHTML(namaJalan)}

            </div>

    `;


    /*
       Jika tidak ada atribut
    */

    if (!keys.length) {

        html += `

            <div
                style="
                    padding:8px 0;
                    color:#666;
                "
            >
                Tidak ada informasi atribut jalan.
            </div>

        `;

    }


    /*
       Tampilkan semua atribut GeoJSON
    */

    keys.forEach(
        key => {

            let value =
                props[key];


            value =
                formatValue(value);


            html += `

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:15px;
                        padding:7px 0;
                        border-bottom:1px solid #e5e7eb;
                    "
                >

                    <span
                        style="
                            font-weight:600;
                            color:#374151;
                        "
                    >
                        ${escapeHTML(key)}
                    </span>

                    <span
                        style="
                            text-align:right;
                            color:#111827;
                        "
                    >
                        ${escapeHTML(value)}
                    </span>

                </div>

            `;

        }
    );


    html += `

        </div>

    `;


    layer.bindPopup(
        html,
        {
            maxWidth:400
        }
    ).openPopup();

}


/* =========================================================
   EVENT JALAN
   ========================================================= */

function jalanEvents(
    feature,
    layer
) {

    const originalStyle =
        jalanStyle();


    layer.on({

        mouseover:
            function(event) {

                const target =
                    event.target;


                target.setStyle({

                    color: "#1d4ed8",

                    weight: 7,

                    opacity: 1

                });


                target.bringToFront();

            },


        mouseout:
            function(event) {

                const target =
                    event.target;


                target.setStyle(
                    originalStyle
                );

            },


        click:
            function() {

                showJalanPopup(
                    feature,
                    layer
                );

            }

    });


    /*
       Tooltip nama jalan
    */

    layer.bindTooltip(
        getNamaJalan(feature),
        {

            sticky: true,

            direction: "top",

            className:
                "jalan-tooltip"

        }
    );

}


/* =========================================================
   LOAD GEOJSON JALAN
   ========================================================= */

async function loadJalan() {

    try {

        notify(
            "Memuat data jalan..."
        );


        // ✅ DIPERBAIKI: nama file tanpa spasi
        const response =
            await fetch(
                "data/jalan.geojson"
            );


        if (!response.ok) {

            throw new Error(
                "File jalan.geojson tidak ditemukan."
            );

        }


        const data =
            await response.json();


        if (
            data.type !==
            "FeatureCollection"
        ) {

            throw new Error(
                "GeoJSON Jalan harus berupa FeatureCollection."
            );

        }


        const features =
            data.features.filter(
                feature =>
                    feature &&
                    feature.geometry
            );


        if (!features.length) {

            throw new Error(
                "GeoJSON Jalan tidak memiliki fitur."
            );

        }


        jalanLayer =
            L.geoJSON(
                {
                    type:
                        "FeatureCollection",

                    features:
                        features

                },
                {

                    style:
                        jalanStyle,

                    onEachFeature:
                        jalanEvents

                }
            );


        /*
           Jalan langsung ditampilkan
        */

        jalanLayer.addTo(map);


        console.log(
            "Layer Jalan berhasil dimuat:",
            features.length,
            "fitur"
        );


        /*
           Update status checkbox
        */

        const toggle =
            document.getElementById(
                "jalanToggle"
            );


        if (toggle) {

            toggle.checked = true;

        }


        notify(
            `${features.length} data jalan berhasil dimuat.`
        );


    }

    catch(error) {

        console.error(
            "Gagal memuat Jalan:",
            error
        );


        notify(
            "Data Jalan belum dapat dimuat. Pastikan jalan.geojson berada di folder data."
        );

    }

}


/* =========================================================
   MEMBUAT CHECKBOX JALAN
   ========================================================= */

function createJalanToggle() {

    /*
       Jangan membuat dua kali
    */

    if (
        document.getElementById(
            "jalanLayerItem"
        )
    ) {

        return;

    }


    const parcelToggle =
        document.getElementById(
            "parcelToggle"
        );


    /*
       Jika kontrol Bidang Tanah belum ada,
       coba lagi setelah halaman selesai.
    */

    if (!parcelToggle) {

        console.warn(
            "parcelToggle belum ditemukan."
        );

        return;

    }


    let bidangItem =
        parcelToggle.closest(
            ".layer-item"
        );


    if (!bidangItem) {

        bidangItem =
            parcelToggle.parentElement;

    }


    if (!bidangItem) {

        console.warn(
            "Container layer tidak ditemukan."
        );

        return;

    }


    const parent =
        bidangItem.parentElement;


    /*
       Membuat item Jalan
    */

    const jalanItem =
        document.createElement(
            "div"
        );


    jalanItem.id =
        "jalanLayerItem";


    jalanItem.style.cssText = `

        display:flex;

        align-items:center;

        justify-content:space-between;

        width:100%;

        min-height:42px;

        padding:0 10px;

        box-sizing:border-box;

        cursor:pointer;

    `;


    jalanItem.innerHTML = `

        <div
            style="
                display:flex;
                align-items:center;
                gap:10px;
                min-width:0;
            "
        >

            <span
                style="
                    width:28px;
                    height:4px;
                    border-radius:4px;
                    background:#2563eb;
                    display:inline-block;
                "
            ></span>


            <span
                style="
                    color:inherit;
                    font-size:12px;
                    font-weight:500;
                    white-space:nowrap;
                "
            >
                Jalan
            </span>

        </div>


        <label
            style="
                position:relative;
                width:32px;
                height:18px;
                display:inline-block;
                flex-shrink:0;
                cursor:pointer;
            "
        >

            <input
                type="checkbox"
                id="jalanToggle"
                checked
                style="
                    opacity:0;
                    width:0;
                    height:0;
                    position:absolute;
                "
            >


            <span
                id="jalanSlider"
                style="
                    position:absolute;
                    inset:0;
                    background:#2563eb;
                    border-radius:20px;
                    transition:.25s;
                "
            ></span>


            <span
                id="jalanKnob"
                style="
                    position:absolute;
                    width:14px;
                    height:14px;
                    left:16px;
                    top:2px;
                    background:white;
                    border-radius:50%;
                    transition:.25s;
                    box-shadow:0 1px 3px rgba(0,0,0,.25);
                "
            ></span>

        </label>

    `;


    /*
       Masukkan setelah Bidang Tanah
    */

    parent.insertBefore(
        jalanItem,
        bidangItem.nextSibling
    );


    /*
       Event checkbox
    */

    const toggle =
        document.getElementById(
            "jalanToggle"
        );


    const slider =
        document.getElementById(
            "jalanSlider"
        );


    const knob =
        document.getElementById(
            "jalanKnob"
        );


    toggle.addEventListener(
        "change",
        function() {

            if (this.checked) {

                if (jalanLayer) {

                    jalanLayer.addTo(
                        map
                    );

                }


                slider.style.background =
                    "#2563eb";


                knob.style.left =
                    "16px";


                notify(
                    "Layer jalan diaktifkan."
                );

            }

            else {

                if (jalanLayer) {

                    map.removeLayer(
                        jalanLayer
                    );

                }


                slider.style.background =
                    "#9ca3af";


                knob.style.left =
                    "2px";


                notify(
                    "Layer jalan dimatikan."
                );

            }

        }
    );


    /*
       Klik seluruh baris juga dapat
       mengaktifkan / menonaktifkan.
    */

    jalanItem.addEventListener(
        "click",
        function(event) {

            if (
                event.target.closest(
                    "label"
                )
            ) {

                return;

            }


            toggle.checked =
                !toggle.checked;


            toggle.dispatchEvent(
                new Event(
                    "change"
                )
            );

        }
    );

}


/* =========================================================
   LEAFLET LEGEND JALAN
   ========================================================= */

function createJalanLegend() {

    /*
       Hindari legenda ganda
    */

    if (
        document.getElementById(
            "jalanLegend"
        )
    ) {

        return;

    }


    const JalanLegend =
        L.control({
            position:
                "bottomright"
        });


    JalanLegend.onAdd =
        function() {

            const div =
                L.DomUtil.create(
                    "div",
                    "jalan-legend"
                );


            div.id =
                "jalanLegend";


            div.innerHTML = `

                <div
                    style="
                        font-weight:700;
                        margin-bottom:8px;
                        font-size:13px;
                    "
                >
                    Legenda
                </div>


                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        margin-bottom:5px;
                    "
                >

                    <span
                        style="
                            width:28px;
                            height:4px;
                            background:#2563eb;
                            border-radius:4px;
                            display:inline-block;
                        "
                    ></span>

                    <span>
                        Jalan
                    </span>

                </div>


                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                    "
                >

                    <span
                        style="
                            width:28px;
                            height:4px;
                            background:#dc2626;
                            display:inline-block;
                        "
                    ></span>

                    <span>
                        Batas Desa
                    </span>

                </div>

            `;


            div.style.cssText = `

                background:
                    rgba(255,255,255,.95);

                padding:
                    10px 12px;

                border-radius:
                    8px;

                box-shadow:
                    0 2px 10px rgba(0,0,0,.15);

                font-size:
                    12px;

                color:
                    #111827;

            `;


            L.DomEvent.disableClickPropagation(
                div
            );


            return div;

        };


    JalanLegend.addTo(
        map
    );

}


/* =========================================================
   CSS JALAN
   ========================================================= */

function addJalanCSS() {

    if (
        document.getElementById(
            "jalanLayerCSS"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "jalanLayerCSS";


    style.innerHTML = `

        .jalan-tooltip {

            background:
                rgba(255,255,255,.95);

            border:
                1px solid #2563eb;

            color:
                #1d4ed8;

            font-weight:
                600;

            padding:
                5px 9px;

            border-radius:
                6px;

            box-shadow:
                0 2px 6px rgba(0,0,0,.15);

        }


        .jalan-popup {

            min-width:
                240px;

            font-size:
                13px;

        }


        .jalan-popup .leaflet-popup-content {

            margin:
                12px;

        }


        .dark .jalan-legend {

            background:
                rgba(31,41,55,.95) !important;

            color:
                #fff !important;

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   INISIALISASI LAYER JALAN
   ========================================================= */

function initJalanLayer() {

    addJalanCSS();

    createJalanLegend();

    loadJalan();

    createJalanToggle();

}


/*
   Jalankan setelah seluruh HTML selesai.
*/

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            setTimeout(
                initJalanLayer,
                500
            );

        }
    );

}

else {

    setTimeout(
        initJalanLayer,
        500
    );

}