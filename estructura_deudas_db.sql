--
-- PostgreSQL database dump
--

\restrict 7skKjsN6ws3Kdv36Om1EjLbbwqwZuRIL1fmNEVJl7iPsPqWeFMelaq1poQeVU2P

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: deudas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deudas (
    id integer NOT NULL,
    cliente character varying(100) NOT NULL,
    monto numeric(10,2) NOT NULL,
    fecha_vencimiento date NOT NULL,
    estado character varying(20) DEFAULT 'mora'::character varying NOT NULL,
    descripcion character varying(200),
    calificacion_crediticia character varying(20) DEFAULT 'media'::character varying,
    tasa_interes_corriente numeric(6,5) DEFAULT 0.00080,
    tasa_interes_moratorio numeric(6,5) DEFAULT 0.00150,
    tipo_cobranza character varying(20) DEFAULT 'preventiva'::character varying
);


ALTER TABLE public.deudas OWNER TO postgres;

--
-- Name: deudas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deudas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deudas_id_seq OWNER TO postgres;

--
-- Name: deudas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deudas_id_seq OWNED BY public.deudas.id;


--
-- Name: gestiones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gestiones (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    canal character varying(30) NOT NULL,
    resultado character varying(50) NOT NULL,
    fecha_gestion timestamp without time zone DEFAULT now() NOT NULL,
    observaciones character varying(300)
);


ALTER TABLE public.gestiones OWNER TO postgres;

--
-- Name: gestiones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gestiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gestiones_id_seq OWNER TO postgres;

--
-- Name: gestiones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gestiones_id_seq OWNED BY public.gestiones.id;


--
-- Name: operadores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.operadores (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    disponible boolean DEFAULT true NOT NULL,
    carga_actual integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.operadores OWNER TO postgres;

--
-- Name: operadores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.operadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.operadores_id_seq OWNER TO postgres;

--
-- Name: operadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.operadores_id_seq OWNED BY public.operadores.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    deuda_id integer NOT NULL,
    operador_id integer,
    prioridad character varying(20) DEFAULT 'media'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'abierto'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: deudas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deudas ALTER COLUMN id SET DEFAULT nextval('public.deudas_id_seq'::regclass);


--
-- Name: gestiones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gestiones ALTER COLUMN id SET DEFAULT nextval('public.gestiones_id_seq'::regclass);


--
-- Name: operadores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operadores ALTER COLUMN id SET DEFAULT nextval('public.operadores_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: deudas deudas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT deudas_pkey PRIMARY KEY (id);


--
-- Name: gestiones gestiones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gestiones
    ADD CONSTRAINT gestiones_pkey PRIMARY KEY (id);


--
-- Name: operadores operadores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operadores
    ADD CONSTRAINT operadores_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: gestiones gestiones_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gestiones
    ADD CONSTRAINT gestiones_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: tickets tickets_deuda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_deuda_id_fkey FOREIGN KEY (deuda_id) REFERENCES public.deudas(id);


--
-- Name: tickets tickets_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES public.operadores(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7skKjsN6ws3Kdv36Om1EjLbbwqwZuRIL1fmNEVJl7iPsPqWeFMelaq1poQeVU2P

