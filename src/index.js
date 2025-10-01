import React, { useState, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './credenciales';
import App from './App';
import Disponible from './componentes/disponible';
import FormAñadirDisponible from './componentes/form-añadir-disponible';
import DetallePrenda from './componentes/detalle-prenda';
import FormAñadirProveedor from './componentes/form-añadir-proveedor';
import MarcaAgua from './componentes/marca-agua';
import FormVender from './componentes/form-vender';
import Pedidos from './componentes/pedidos';
import ModificarPedido from './componentes/modificar-pedido';
import FormAñadirCliente from './componentes/form-añadir-cliente';
import Compras from './componentes/compras';
import Entregas from './componentes/entregas';
import PorCobrar from './componentes/por-cobrar';
import AgregarPago from './componentes/agregar-pago';
import Inventario from './componentes/inventario';
import FormVenderInventario from './componentes/form-vender-inventario';
import Estadisticas from './componentes/estadisticas';
import AñadirPedidoDirecto from './componentes/añadir-pedido-directo';
import Descripciones from "./componentes/Descripciones";
import Clientes from "./componentes/clientes";
import EditarCliente from './componentes/editar-cliente';
import Login from './componentes/Login';


function Root() {

    // If you want to start measuring performance in your app, pass a function
    // to log results (for example: reportWebVitals(console.log))
    // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
    return (
        <Router >

            <Routes>

                <Route path='/' element={<App />} />

                <Route path='Disponible' element={<Disponible />} />

                <Route path='FormAñadirDisponible' element={<FormAñadirDisponible />} />

                <Route path='DetallePrenda/:id' element={<DetallePrenda />} />

                <Route path='FormAñadirProveedor' element={<FormAñadirProveedor />} />

                <Route path='MarcaAgua' element={<MarcaAgua />} />

                <Route path='FormVender/:id' element={<FormVender />} />

                <Route path='Pedidos' element={<Pedidos />} />

                <Route path='ModificarPedido/:id' element={<ModificarPedido />} />

                <Route path='FormAñadirCliente' element={<FormAñadirCliente />} />

                <Route path='Compras' element={<Compras />} />

                <Route path='Entregas' element={<Entregas />} />

                <Route path='PorCobrar' element={<PorCobrar />} />

                <Route path='AgregarPago/:id' element={<AgregarPago />} />

                <Route path='Inventario' element={<Inventario />} />

                <Route path='FormVenderInventario/:id' element={<FormVenderInventario />} />

                <Route path='Estadisticas' element={<Estadisticas />} />

                <Route path='AñadirPedidoDirecto' element={<AñadirPedidoDirecto />} />

                <Route path='Descripciones' element={<Descripciones />} />

                <Route path='Clientes' element={<Clientes />} />

                <Route path='EditarCliente/:id' element={<EditarCliente />} />

            </Routes>

        </Router>

    );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
