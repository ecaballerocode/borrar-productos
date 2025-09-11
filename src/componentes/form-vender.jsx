import React from "react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, addDoc, getDocs, updateDoc, where, query } from "firebase/firestore";
import { db } from "../credenciales";
import Header from "./header";
import MenuLateral from "./menu-lateral";
import Footer from "./footer";
import MenuAñadir from "./menu-añadir";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Select from "react-select";

// ✅ FUNCIÓN PARA ACTUALIZAR PERFIL DE RECOMENDACIÓN
// ✅ FUNCIÓN PARA ACTUALIZAR PERFIL DE RECOMENDACIÓN — ¡CORREGIDA!
const actualizarPerfilTrasNuevoPedido = async (clienteId) => {
  try {
    console.log(`🔄 Iniciando actualización de perfil para cliente: ${clienteId}`);

    // ✅ Validar que el cliente exista
    const clienteRef = doc(db, "clientes", clienteId);
    const clienteSnap = await getDoc(clienteRef);
    if (!clienteSnap.exists()) {
      console.error(`❌ Cliente con ID ${clienteId} no existe en la colección "clientes".`);
      return false;
    }

    // ✅ Calcular fecha de hace 1 año como string (YYYY-MM-DD)
    const unAnioAtras = new Date();
    unAnioAtras.setFullYear(unAnioAtras.getFullYear() - 1);
    const unAnioAtrasStr = unAnioAtras.toISOString().split('T')[0];

    // ✅ Consultar pedidos del último año
    const q = await getDocs(
      query(
        collection(db, "pedidos"),
        where("clienteId", "==", clienteId),
        where("fecha", ">=", unAnioAtrasStr)
      )
    );

    const pedidos = q.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: new Date(data.fecha) // Convierte string a Date para cálculos
      };
    });

    console.log(`📅 Pedidos encontrados en últimos 12 meses: ${pedidos.length}`);
    if (pedidos.length === 0) {
      console.warn("⚠️ No hay pedidos en el último año. No se actualizará el perfil.");
      return false;
    }

    // ✅ Calcular métricas
    const gastoTotal = pedidos.reduce((sum, p) => sum + (p.precio || 0), 0);
    const gastoPromedio = pedidos.length > 0 ? gastoTotal / pedidos.length : 0;

    const categorias = {};
    const prendas = {};
    const colores = {};
    const tallas = {};

    pedidos.forEach(p => {
      if (p.categoria) categorias[p.categoria] = (categorias[p.categoria] || 0) + 1;
      if (p.prenda) prendas[p.prenda] = (prendas[p.prenda] || 0) + 1;
      if (p.color) colores[p.color] = (colores[p.color] || 0) + 1;
      if (p.talla) tallas[p.talla] = (tallas[p.talla] || 0) + 1;
    });

    const topCategorias = Object.entries(categorias).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    const topPrendas = Object.entries(prendas).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    const topColores = Object.entries(colores).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    const topTallas = Object.entries(tallas).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);

    const precios = pedidos.map(p => p.precio).filter(p => p != null);
    const precioMin = precios.length > 0 ? Math.min(...precios) : 0;
    const precioMax = precios.length > 0 ? Math.max(...precios) : 0;

    const ultimaCompraDoc = pedidos.reduce((latest, p) => p.fecha > latest.fecha ? p : latest, pedidos[0]);
    const ultimaCompra = ultimaCompraDoc.fecha;
    const diasDesdeUltimaCompra = Math.floor((new Date() - ultimaCompra) / (1000 * 60 * 60 * 24));

    let tipoCliente = "nuevo";
    if (pedidos.length >= 8) tipoCliente = "vip";
    else if (pedidos.length >= 4) tipoCliente = "frecuente";
    else if (diasDesdeUltimaCompra > 60) tipoCliente = "inactivo";

    let presupuesto = "bajo";
    if (gastoPromedio > 800) presupuesto = "alto";
    else if (gastoPromedio > 400) presupuesto = "medio";

    const variedadColores = Object.keys(colores).length;
    const estiloCompra = variedadColores > 3 ? "aventurero" : "conservador";

    // ✅ Construir objeto completo de perfil_recomendacion
    const nuevoPerfil = {
      total_pedidos_12m: pedidos.length,
      gasto_promedio_por_compra: parseFloat(gastoPromedio.toFixed(2)),
      frecuencia_compra_mensual: parseFloat((pedidos.length / 12).toFixed(2)),
      ultima_compra: ultimaCompra.toISOString().split('T')[0],
      dias_desde_ultima_compra: diasDesdeUltimaCompra,
      tipo_cliente: tipoCliente,
      presupuesto_estimado: presupuesto,
      categorias_favoritas: topCategorias,
      prendas_mas_compradas: topPrendas,
      colores_favoritos: topColores,
      tallas_mas_usadas: topTallas,
      rango_precio_min: precioMin,
      rango_precio_max: precioMax,
      estilo_compra: estiloCompra,
      variedad_colores: variedadColores,
      actualizado_en: new Date(), // ← Timestamp (mejor práctica)
      periodo_analisis: "12_meses"
    };

    // ✅ SOBREESCRIBIR COMPLETAMENTE el campo perfil_recomendacion
    await updateDoc(clienteRef, {
      perfil_recomendacion: nuevoPerfil
    }, { merge: true }); // ← merge: true para no borrar otros campos del cliente

    console.log(`✅ Perfil actualizado correctamente para cliente ${clienteId}`);
    return true;

  } catch (error) {
    console.error("🔥 Error actualizando perfil:", error);
    return false;
  }
};

function FormVender() {
  const [menuAbierto, setmenuAbierto] = useState(false);
  const [menuAñadir, setmenuAñadir] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [fecha, setFecha] = useState("");
  const [imagenSeleccionada, setImagenSeleccionada] = useState("");
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [precioBase, setPrecioBase] = useState(0);

  const { id } = useParams();

  const ClientesOptions = clientes.map((cliente) => ({
    value: cliente.id,      // ← ID del cliente (clave!)
    label: cliente.cliente, // ← Nombre para mostrar
  }));

  const [Data, setData] = useState({
    prenda: "",
    detalles: "",
    costo: "",
    precio: "",
    tallas: "",
    talla: "",
    categoria: "",
    proveedor: "",
    fotos: [],
    cliente: null, // ← ahora es objeto {value, label}
    fecha: "",
    color: "",
    pago: "",
    lugar: "",
    entrega: "",
    comprado: false,
    entregado: false
  });

  const lugares = [
    "Tlalmanalco", "San Rafael", "Ameca", "CDMX", "Chalco", "Ixtapaluca", "Miraflores", "Chihuahua", "Interior"
  ];

  const tallas = [
    "(Inf 2-4)", "(Inf 4-6)", "(Inf 8-10)", "(Inf 10-12)", "(Inf 6-8)", "(Inf 10-12)", "(juv 14-16)", "(XS 3-5)", "(28-30)", "(30-32)", "(30-34)",
    "(32-36)", "(32-34)", "(34-36)", "(36-38)", "(38-40)", "(40-42)", "Unitalla", "(5)", "(7)", "(9)",
    "(11)", "(13)", "(15)", "(17)", "(4)", "(6)", "(8)", "(10)", "(12)", "(14)", "(16)", "(28)", "(30)",
    "(32)", "(34)", "(36)", "(38)", "(40)", "(42)"
  ];

  const formaEntrega = ["Punto de venta", "A domicilio"];

  const tallaOptions = tallas.map((talla) => ({
    value: talla,
    label: talla,
  }));

  const entregaOptions = formaEntrega.map((entrega) => ({
    value: entrega,
    label: entrega,
  }));

  const lugaresOptions = lugares.map((lugar) => ({
    value: lugar,
    label: lugar,
  }));

  const opcionesDescuento = [
    { value: 0, label: "Sin descuento" },
    ...Array.from({ length: 20 }, (_, i) => {
      const val = (i + 1) * 5;
      return { value: val, label: `${val}%` };
    }),
  ];

  const manejadorMenu = () => {
    setmenuAbierto(!menuAbierto);
  };

  const manejadorMenuAñadir = () => {
    setmenuAñadir(!menuAñadir);
  };

  const manejadorFecha = (e) => {
    const nuevaFecha = e.target.value;
    setFecha(nuevaFecha);
    setData({ ...Data, fecha: nuevaFecha });
  };

  useEffect(() => {
    const fetchPrenda = async () => {
      try {
        const prendaRef = doc(db, "disponible", id);
        const prendaDoc = await getDoc(prendaRef);

        if (prendaDoc.exists()) {
          const data = prendaDoc.data();
          setData({
            prenda: data.prenda,
            detalles: data.detalles,
            costo: data.costo,
            precio: data.precio,
            precioOriginal: data.precio,
            tallas: data.talla,
            categoria: data.categoria,
            proveedor: data.proveedor,
            fotos: data.fotos || [],
          });
          setPrecioBase(parseFloat(data.precio));
          if (data.fotos && data.fotos.length > 0) {
            setImagenSeleccionada(data.fotos[0]);
          }
        }
      } catch (error) {
        console.error("Error al obtener la prenda:", error);
      }
    };
    fetchPrenda();
  }, [id]);

  useEffect(() => {
    const porcentaje = parseFloat(porcentajeDescuento) || 0;
    const descuento = precioBase * (porcentaje / 100);
    const descuentoRedondeado = redondearAlMultiploDe5(descuento);
    const nuevoPrecio = Math.max(precioBase - descuentoRedondeado, 0);

    setData(prev => ({
      ...prev,
      precio: redondearAlMultiploDe5(nuevoPrecio),
    }));
  }, [porcentajeDescuento, precioBase]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clientes"));
        const docsArray = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClientes(docsArray);
      } catch (error) {
        console.error("Error al cargar los proveedores", error);
      }
    };
    fetchClientes();
  }, []);

  const fetchNewPrenda = async () => {
    try {
      const prendaRef = doc(db, "disponible", id);
      const prendaDoc = await getDoc(prendaRef);

      if (prendaDoc.exists()) {
        const data = prendaDoc.data();
        setData({
          prenda: data.prenda,
          detalles: data.detalles,
          costo: data.costo,
          precio: data.precio,
          precioOriginal: data.precio,
          tallas: data.talla,
          talla: "",
          categoria: data.categoria,
          proveedor: data.proveedor,
          fotos: data.fotos || [],
          cliente: null,
          fecha: "",
          color: "",
          pago: 0,
          lugar: "",
          entrega: "",
          comprado: false,
          entregado: false
        });
        setPrecioBase(parseFloat(data.precio));
      }
    } catch (error) {
      console.error("Error al obtener la prenda:", error);
    }
  };

  const handleClienteChange = (selectedOption) => {
    setData({ ...Data, cliente: selectedOption });
  };

  const handleTallaChange = (selectedOption) => {
    setData({ ...Data, talla: selectedOption });
  };

  const handleLugarChange = (selectedOption) => {
    setData({ ...Data, lugar: selectedOption });
  };

  const handleEntregaChange = (selectedOption) => {
    setData({ ...Data, entrega: selectedOption });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...Data, [name]: value });
  };

  const handleComprado = () => {
    setData({ ...Data, comprado: !Data.comprado });
  };

  const handleEntregado = () => {
    setData({ ...Data, entregado: !Data.entregado });
  };

  function redondearAlMultiploDe5(numero) {
    return Math.ceil(numero / 5) * 5;
  }

  // ✅ handleSubmit ACTUALIZADO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!Data.cliente) {
      alert("Por favor, selecciona un cliente.");
      return;
    }

    const clienteId = Data.cliente.value; // ← EXTRAEMOS EL ID

    const dataToSubmit = {
      ...Data,
      cliente: Data.cliente.label,      // nombre para mostrar
      clienteId: clienteId,             // ← ¡CAMPO CLAVE AÑADIDO!
      lugar: Data.lugar?.label || "",
      entrega: Data.entrega?.label || "",
      talla: Data.talla?.label || "",
      fotos: imagenSeleccionada,
      pago: Data.pago?.label || "",
      comprado: !!Data.comprado,
      entregado: !!Data.entregado
    };

    try {
      const docRef = await addDoc(collection(db, "pedidos"), dataToSubmit);
      alert("Pedido agregado con éxito.");

      // ✅ ACTUALIZAR PERFIL DEL CLIENTE
      const perfilActualizado = await actualizarPerfilTrasNuevoPedido(clienteId);
      if (perfilActualizado) {
        console.log("✅ Perfil de cliente actualizado");
      }

      // Resetear formulario
      fetchNewPrenda();
      setFecha("");
      setImagenSeleccionada("");

    } catch (error) {
      alert("Hubo un error al agregar el pedido.");
      console.error("Error al agregar el pedido:", error);
    }
  };

  const settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    beforeChange: (oldIndex, newIndex) => {
      setImagenSeleccionada(Data.fotos[newIndex]);
    },
  };

  return (
    <div className="bg-pink-100 min-h-screen">
      <header className="relative">
        <Header menuAbierto={menuAbierto} manejadorMenu={manejadorMenu} />
        <h1 className="fixed inset-x-0 transform pt-2 text-center pointer-events-none text-xl font-bold text-white z-50">Vender prenda</h1>
      </header>
      <div>
        <MenuLateral menuAbierto={menuAbierto} />
      </div>
      <div>
        <MenuAñadir menuAñadir={menuAñadir} />
      </div>
      <main className="pb-16 pt-10 flex lg:flex-row flex-col justify-between">
        <div className="h-auto border-2 p-5 rounded-lg shadow-xl border-pink-200 m-10 flex justify-center flex-col lg:flex-row">
          {Data.fotos.length > 1 ? (
            <Slider {...settings} className="w-64 pt-12 mb-5 mx-auto">
              {Data.fotos.map((foto, index) => (
                <div key={index}>
                  <img
                    src={foto}
                    alt={`Prenda ${index}`}
                    className="w-auto h-64 rounded-lg"
                  />
                </div>
              ))}
            </Slider>
          ) : (
            <div className="w-64 pt-12 mb-5 mx-auto">
              <img
                src={Data.fotos[0]}
                alt="Prenda"
                className="w-auto h-64 rounded-lg"
              />
            </div>
          )}
          <div className="lg:ml-5 lg:mt-10 mt-1">
            <p className="mb-5 font-bold text-lg text-pink-700 m-2">{Data.prenda}</p>
            <p className="text-pink-600 m-2">{Data.proveedor}</p>
            <p className="text-pink-600 m-2">{Data.categoria}</p>
            <div className="flex felx-row justify-between m-2">
              <p className="text-pink-600">${Data.costo}</p>
              <p className="text-pink-700 font-bold">${Data.precio}</p>
            </div>
            <p className="mb-5 text-pink-600 m-2">{Data.tallas}</p>
            <p className="text-pink-600 text-sm m-2">{Data.detalles}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="lg:border-2 lg:shadow-xl h-auto px-5 lg:py-2 pb-20 mt-10 mr-10 rounded-lg border-pink-200 max-w-lg w-full">
          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold" htmlFor="datePicker">Fecha</label>
            <input className="w-full px-2 h-8 bg-white rounded-md shadow-sm" type="date" id="datePicker" value={fecha}
              onChange={manejadorFecha} placeholder="Fecha" />
          </div>
          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold">Cliente:</label>
            <Select
              options={ClientesOptions}
              value={Data.cliente}
              onChange={handleClienteChange}
              isClearable
              placeholder="Seleccionar cliente"
            />
          </div>
          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold">Talla:</label>
            <Select
              options={tallaOptions}
              value={Data.talla}
              onChange={handleTallaChange}
              isClearable
              placeholder="Seleccionar talla"
            />
          </div>
          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold">Color:</label>
            <input
              type="text"
              name="color"
              value={Data.color}
              onChange={handleChange}
              placeholder="Seleccionar color"
              required
              className="px-2 rounded-md h-8 shadow-sm"
            />
          </div>

          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold">Descuento:</label>
            <Select
              options={opcionesDescuento}
              value={opcionesDescuento.find((op) => op.value === parseInt(porcentajeDescuento))}
              onChange={(selected) => setPorcentajeDescuento(selected?.value || 0)}
              placeholder="Selecciona descuento"
              isClearable
            />
          </div>
          <div className="flex flex-col pt-2">
            <label className="px-2 text-pink-800 font-bold">Precio con descuento:</label>
            <p className="px-2 py-1 bg-white rounded-md shadow-sm text-lg font-semibold text-pink-700">
              ${Data.precio}
            </p>
          </div>

          <div className="flex flex-row justify-between">
            <div className="flex flex-col pt-2 w-1/2 pr-2">
              <label className="px-2 text-pink-800 font-bold">Lugar de entrega:</label>
              <Select
                options={lugaresOptions}
                name="lugar"
                value={Data.lugar}
                onChange={handleLugarChange}
                isClearable
                required
                placeholder="Seleccionar un lugar"
              />
            </div>
            <div className="flex flex-col pt-2 w-1/2 pl-2">
              <label className="px-2 text-pink-800 font-bold">Forma de entrega:</label>
              <Select
                options={entregaOptions}
                name="entrega"
                value={Data.entrega}
                onChange={handleEntregaChange}
                isClearable
                required
                placeholder="Seleccionar una forma"
              />
            </div>
          </div>
          <div className="flex flex-row mt-4 mx-10 justify-between">
            <div className="flex flex-col">
              <input type="checkbox" checked={Data.comprado} onChange={handleComprado} />
              <label className="text-pink-800">¿Comprado?</label>
            </div>
            <div className="flex flex-col">
              <input type="checkbox" checked={Data.entregado} onChange={handleEntregado} />
              <label className="text-pink-800">¿Entregado?</label>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              className="mt-2 py-2 px-4 bg-pink-400 w-1/2 mb-5 shadow-xl text-white rounded-md cursor-pointer hover:bg-pink-200"
            >
              Vender
            </button>
          </div>
        </form>
      </main>
      <Footer manejadorMenuAñadir={manejadorMenuAñadir} />
    </div>
  );
}

export default FormVender;