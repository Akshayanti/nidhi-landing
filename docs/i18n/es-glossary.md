# Spanish glossary

One approved Spanish rendering per recurring term, so the chrome, the learning
path and the tools keep agreeing. Change a term here first, then everywhere it
appears. The chrome's and the path's copy lives in `src/i18n/strings/es.ts`, the
path's shared vocabulary in `learn.ts`, and the tools' copy in
`src/i18n/strings/tools/`.

The lessons are not translated: they are written once, in English, and every
language lists those same lessons and links to them at their one address. This
glossary governs the Spanish the site itself writes.

Status: fixed when the first Spanish strings were written and reviewed by
Codex and DeepSeek, then extended with the terms the full catalogs introduced.
Terms are added as the site's own Spanish copy needs them, and a term already
listed is not re-decided per page.

## Rules that apply to every string

1. **No em dashes and no double dashes.** Spanish uses the long dash (the
   raya) for dialogue and asides; on this site it is out, as is a doubled
   hyphen. Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it,
   the cited evidence with its limits, where it breaks, what depends on the
   reader's situation. Describe common practice ("un punto de partida habitual
   es...", "mucha gente empieza por...") rather than instructing ("empieza
   por...", "deberías..."). Imperatives are fine for neutral actions (anota tus
   cuentas, revisa tu extracto), not for allocation, product, debt or tax
   decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the
   cited sources and the country-neutral "where to check locally" wording stay
   as the English has them. No country's products (AFORE, plan de pensiones,
   401(k) equivalents) are introduced where the English has none.
4. **Neutral international Spanish.** No vocabulary tied to one country:
   no *vosotros* (plural "you" is *ustedes*, though the site rarely needs it),
   no *ordenador*/*computadora* (say *dispositivo* or reword), no *coche*/*carro*,
   no *móvil*/*celular* (say *teléfono*). Where two regions differ, pick the word
   both understand, and record it here.
5. **Tú, not usted**, everywhere: *tu dinero*, *puedes*, *escribe*. Possessives
   and imperatives agree with tú (*elige*, not *elija*).
6. **Amounts in the site's own copy are written the Spanish way:** `10.000 €`,
   `250.000 $`. A four-digit amount has no separator: `1000 €`, as
   `Intl.NumberFormat('es')` writes it. Decimals take a comma: `4,5 %`,
   `0,25 %`. A percentage takes a space before the sign (`4 %`), per the RAE.
   This is the format `formatProseAmount('es', ...)` produces, so a catalog
   figure and a computed one beside it agree. The tools write their computed
   amounts the same way on a Spanish page, in every currency, with the
   currency's narrow symbol after the number (`1.058.721 €`, `1500 £`, see
   `TOOL_AMOUNT_LOCALE`). A lesson's figures are never touched.
   Use a no-break space (U+00A0) between a number and `€` or `%`, as `Intl`
   does, so the two never wrap apart. DeepSeek noted that `10.000` is not the
   convention in Mexico and Central America; it is the RAE's and the euro's,
   which is why it was kept. A native speaker later asked for the symbol
   first (`€150`); Claude, Codex and DeepSeek agreed to keep `150 €`, since
   FundéuRAE notes `15 €` is usual in Spain and `€15` in the Americas, so
   neither is neutral and the RAE form stays the house style.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
   Keep the same set of placeholders in every string; their order may change.
8. **Opening marks**: questions and exclamations take `¿` and `¡`.
9. **Capitalisation**: sentence case for headings and buttons (*Cómo
   empezar*, not *Cómo Empezar*). Month and day names, languages and
   nationalities are lower case (*octubre*, *español*).
10. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub,
    Instagram, people's names (Alex, Sam), and each language's own name in
    `LOCALE_META`.
11. **Gender**: prefer wording that does not mark the reader's gender
    (*quien empieza* rather than *el principiante*; *las personas* rather than
    *los usuarios*). No `@`, `x` or `e` endings.
12. **Quotation marks**: Spanish copy quotes with angle quotes, `«...»`, for
    every quoted word, label, button name, title or phrase (*pulsa «Copiar
    enlace»*, *menos del 20 % es «bajo»*). A quote inside a quote takes
    curly marks: `«... “...” ...»`. Straight `"..."` and curly `“...”` are
    never used as quotation marks in a Spanish value; quotes that belong to
    code or an HTML attribute inside a string are left alone.

## Vocabulary

### Money and the balance sheet

| English | Spanish | Notes |
| --- | --- | --- |
| net worth | patrimonio neto | Not *valor neto* (a calque) and not *riqueza neta*. *Patrimonio* alone means total assets in many contexts, so keep *neto*. |
| assets | activos | *Lo que tienes* in plain-language lists (what you own, owe, earn). |
| what you owe | lo que debes | |
| liabilities | pasivos | *Deudas* where the sentence is plain-language. |
| debt | deuda | |
| loan | préstamo | Not *crédito*, which in some countries means a credit line. |
| mortgage | hipoteca | Understood everywhere; *crédito hipotecario* only where the English says "mortgage loan". |
| principal | capital | *Capital pendiente* for the outstanding principal. |
| interest | interés, intereses | *Interés* for the concept and for an amount (*el interés pagado*); *intereses* where it is idiomatic (*pagar intereses*). |
| interest rate | tipo de interés / tasa de interés | Use **tasa de interés**: it is the form most of the Spanish-speaking world uses and is understood in Spain. |
| income | ingresos | |
| expenses | gastos | |
| savings | ahorro, ahorros | *Ahorro* for the act and the rate (*tasa de ahorro*); *ahorros* for money already saved (*tus ahorros*). |
| budget | presupuesto | |
| emergency fund | fondo de emergencia | |
| cash flow | flujo de efectivo | Not *flujo de caja*, which leans to Spain. |
| net pay | sueldo neto | |
| credit card | tarjeta de crédito | |
| real estate | inmuebles | The topic name. |
| car | vehículo | Neither *coche* nor *carro* (rule 4). |

### Growing money

| English | Spanish | Notes |
| --- | --- | --- |
| investing, investment | inversión | |
| return | rentabilidad | Not *retorno* (a calque) or *rendimiento* alone; *rendimiento* is acceptable where *rentabilidad* repeats awkwardly. |
| compound interest | interés compuesto | |
| compounding | capitalización compuesta / el efecto del interés compuesto | Prefer the second in plain prose. |
| inflation | inflación | |
| purchasing power | poder adquisitivo | |
| risk | riesgo | |
| volatility | volatilidad | |
| diversification | diversificación | |
| asset allocation | asignación de activos | |
| rebalancing | reequilibrio (de la cartera) | Not *rebalanceo*, an anglicism. |
| portfolio | cartera | Not *portafolio* (regional). |
| index fund | fondo indexado | |
| mutual fund | fondo de inversión | |
| share, stock | acción, acciones | |
| equities | renta variable | *Acciones* where plain language reads better. |
| bond | bono | |
| fixed income | renta fija | |
| expense ratio | gastos anuales del fondo (TER) | A percentage of what you hold, said so on first use. Not *gastos corrientes*, which reads as operating costs in Latin America. |
| fees | comisiones | |
| tax | impuesto(s) | |
| tax-advantaged account | cuenta con ventajas fiscales | |
| real return | rentabilidad real | |
| asset classes | clases de activos | |
| leverage | apalancamiento | |
| currency risk | riesgo cambiario | Always. Never *riesgo de divisa* or *riesgo de cambio*. |
| exposure | exposición | *Exposición elevada*, *exposición neta*. |
| concentration | concentración | A currency's share of net worth. |
| hedging | cobertura | *Estrategias de cobertura*. |
| broker | bróker | With the accent. |
| spread | margen | The bank's or broker's FX spread, and the margin over an index on a variable-rate loan. Not *diferencial*. |
| asset location | ubicación de activos | |
| glide path | glide path | Kept in English and glossed: *la senda que reduce el riesgo de la cartera con los años*. |
| standard deviation | desviación estándar | |
| inflation-adjusted, real | descontada la inflación | *Rentabilidad descontada la inflación*; *en dinero de hoy* for amounts. |
| mix (stocks/bonds) | combinación | *Combinación de acciones y bonos*. |
| monthly contribution | aportación mensual | |
| withdrawal (a single one) | retiro, retiros | *Retiro anual*, *activar los retiros*. The rate stays *tasa de retiro*. |
| intergenerational wealth | riqueza intergeneracional | |

### Planning and behaviour

| English | Spanish | Notes |
| --- | --- | --- |
| financial independence | independencia financiera | |
| FIRE | FIRE | The English acronym, kept as is and glossed on first use: *independencia financiera y jubilación anticipada*. |
| retirement | jubilación | |
| withdrawal rate | tasa de retiro | The standard term in Spanish writing on FIRE. Glossed on first use as *el porcentaje de la cartera que retiras cada año*, because *retiro* also means retirement in parts of Latin America. |
| safe withdrawal rate | tasa de retiro segura | |
| the 4% rule | la regla del 4 % | |
| horizon | horizonte temporal | *Plazo* where the sentence is about a loan. |
| goal | objetivo | *Meta* is fine where *objetivo* repeats. |
| credit score | puntuación de crédito | Never *historial crediticio*, which is the credit history, not the score. |
| insurance | seguro | |
| premium | prima | |
| deductible | la parte que pagas tú antes de que el seguro cubra el resto | Spelled out: *franquicia* (Spain) and *deducible* (Latin America) each mislead the other half. A tight label may say *franquicia o deducible*. |
| liquidity | liquidez | |
| risk tolerance | tolerancia al riesgo | |
| tax residency | residencia fiscal | |
| opportunity cost | coste de oportunidad / costo de oportunidad | Use **costo de oportunidad**; likewise *costo* over *coste* throughout. |
| rule of thumb | regla general | Not *regla de oro*, which overstates it. |
| sunk cost | costo hundido | |
| loss aversion | aversión a la pérdida | |
| bias | sesgo | Present bias is *sesgo del presente*. |
| behavioural finance | finanzas conductuales | |
| mental accounting | contabilidad mental | |
| overconfidence | exceso de confianza | |
| anchoring | anclaje | |
| herd behaviour | efecto manada | |
| default (assumption, setting) | valor predeterminado, supuesto de partida | Never *por defecto* beside debt, where *default* means a missed payment (*impago*). |
| financial fragility | fragilidad financiera | |
| estate planning | planificación patrimonial (testamento y herencia) | |
| means-tested benefits | ayudas sujetas a nivel de ingresos y patrimonio | |
| no prerequisite | no hace falta leer nada antes | |
| qualified professional | profesional acreditado | Always. Never *cualificado* or *calificado*. |
| licensed (financial adviser) | con licencia | *Asesor financiero con licencia*; not *autorizado*. |
| money scripts | guiones de dinero (money scripts) | English kept in brackets on first use. |
| framing | encuadre | *Encuadre y anclaje*. |
| blended families | familias reconstituidas | |
| gig work | trabajo por encargo | |
| person of colour | personas racializadas | *De color* reads as dated in many regions. |
| queer | queer | Used as is in Spanish writing. |
| neurodivergent | neurodivergente | |
| colour blind | tener daltonismo | A condition the person has, not an adjective for them. |

### The site

| English | Spanish | Notes |
| --- | --- | --- |
| lesson | lección | |
| learning path | ruta de aprendizaje | |
| level | nivel | |
| Discovery | Descubrimiento | Level names. |
| Building | Construcción | |
| Psychology | Psicología | |
| Optimizing | Optimización | |
| Mastery | Dominio | |
| Inclusive Finances | Finanzas inclusivas | Never *inclusivas* alone. |
| topic (tag) | tema | |
| free tools | herramientas gratuitas | |
| net worth calculator | calculadora de patrimonio neto | |
| loan comparison | comparador de préstamos | |
| Monte Carlo simulator | simulador Monte Carlo | |
| inflation calculator | calculadora de inflación | |
| waitlist | lista de espera | |
| newsletter | boletín | |
| share link | enlace para compartir | |
| beliefs (page) | en qué creemos | |
| editorial policy | política editorial | |
| personal finance | finanzas personales | |
| financial literacy | educación financiera | |
| further reading | para seguir leyendo | |
| planner (the product) | planificador | *El planificador de nidhi*. |
| Learn, Take stock, Plan ahead (step names) | Aprende, Haz balance, Planifica | Imperatives as labels, as in English. |
| Learn (nav, footer, breadcrumb) | Aprende | The same word in the menu, the footer and the breadcrumb. |
| Home | Inicio | |
| About (group) / About nidhi (page) | Acerca de / Sobre nidhi | |
| Browse topics | Explorar temas | |
| breadcrumb (landmark label) | Ruta de navegación | |
| FAQ | Preguntas frecuentes | |
| paywall | muro de pago | |
| illustrative amounts | cifras ilustrativas | |
| dashboard | panel | *Panel de seguimiento* where it stands alone in a list of topics. |

### The privacy notice

| English | Spanish | Notes |
| --- | --- | --- |
| privacy notice | aviso de privacidad | *Política de privacidad* only where the English says "policy". |
| analytics | analítica | |
| processor | encargado del tratamiento | The GDPR's Spanish term. |
| consent | consentimiento | |
| retention | conservación | |
| material (change) | relevante | The badge on a changelog entry. |
| changelog | registro de cambios | |
| Earlier changes | Cambios anteriores | |
| anonymous | anónimo | |
| localStorage | localStorage | Latin, like the key names. |
| cookie banner | aviso de cookies | |
| GDPR | RGPD | |
| timestamp | fecha y hora | |
| double opt-in | doble confirmación | |
| single opt-in | alta directa (single opt-in) | Says there is no confirmation step. Never *una sola confirmación*, which says there is one. |
| unsubscribe | cancelar la suscripción | |
| waitlist signups | altas en la lista de espera | |
| Cookie settings | Configuración de cookies | The footer link, quoted with the same words in the notice. |
| bookmark (a page) | guardar en favoritos | Not *marcadores*, which leans to Spain. |

#### The English governs, and the changelog is never translated

The Spanish privacy notice says that the English notice is the governing
version, and the changelog stays in English in every edition (see `CLAUDE.md`).

### The free tools

| English | Spanish | Notes |
| --- | --- | --- |
| monthly payment | cuota mensual | |
| loan amount | cantidad del préstamo | *Importe* leans to Spain and *monto* to Latin America. |
| annual interest rate | tasa de interés anual | |
| term (months) | plazo (meses) | |
| amortisation schedule | tabla de amortización | *Cuadro* leans to Spain. |
| balance (of a loan) | saldo pendiente | |
| balance (of a portfolio) | valor de la cartera | Not *saldo*, which reads as money owed. |
| lender | entidad financiera | *Prestamista* reads as a private moneylender. |
| recast | recalcular la cuota | Where the tool defines it: on the remaining balance, keeping the rate and the end date. |
| apply to principal | aplicar al capital | *Reduce el capital* is fine for the effect. Never *sumar al capital*, which says the debt grows. |
| total cost | costo total | |
| origination fee, closing costs | comisión de apertura y gastos iniciales | *Gastos de cierre* is US Spanish. |
| discount points | puntos de descuento | Glossed on first use: *pagos por adelantado para bajar la tasa*. |
| break-even | punto de equilibrio | |
| refinance | refinanciar | |
| prepayment | pago anticipado | *Amortización anticipada* leans to Spain. |
| exchange rate | tipo de cambio | |
| home currency | moneda de referencia | *Moneda principal* can read as a dominant world currency. |
| percentile | percentil | |
| median | mediana | |
| APR | APR (tasa de porcentaje anual) | The tool's figure is the US nominal APR, glossed once. Never labelled TAE, and never glossed *tasa anual equivalente* (what TAE stands for). |
| APRC (EU) | TAE | Its name in the EU directive's Spanish text. |
| ECB | BCE | *Tipos del BCE*. |
| business day | día hábil | |
| row (of the net worth table) | elemento | *{count} elementos*; *fila* where the sentence is about the table itself (*fila {index}*). |
| donut chart | gráfico de anillo | |
| fan chart | gráfico de abanico | |
| Full / Redacted (share options) | Versión completa / Versión anónima | |
| Cautious / Historical / Optimistic | Prudente / Histórico / Optimista | The return settings. |
| lump sums | pagos extraordinarios | |
| prepayment penalty | penalización por pago anticipado | |
| months to payoff | meses hasta liquidar | |
| advertised (headline) rate | tasa anunciada | |
| present value | valor actual | |
| percentage points | p. p. | In tight labels; spelled out (*puntos porcentuales*) in prose. |
| refinancing scenario | escenario de refinanciación | |
| n/a | n. d. | |
| input prompt (Enter...) | Escribe... | *Escribe la cantidad*, *Escribe valores arriba*; not *Introduce*. |
| Add (button) | Añadir | Infinitive on buttons: *Añadir entidad*, *+ Añadir activo*. |
| simulation, path | simulación, trayectoria | |
| inflation calculator | calculadora de inflación | |
| raise (in pay) | subida salarial | *Aumento de sueldo* is fine in prose; the field says *subida*. |
| real rate | tasa real | Follows *rentabilidad real*. |
| geometric average | media geométrica | |
| percentage point | punto porcentual | *Punto* alone where the sentence already says porcentual. |
| scenario, forecast | escenario, previsión | Not *pronóstico*, which leans to weather and sport. |
| basket (CPI) | conjunto de bienes y servicios | *Cesta* (Spain) and *canasta* (Latin America) each lean to one side. |
| hyperinflation | hiperinflación | |
| about (an approximate amount) | unos | *Unos 7440 €*; *más de* and *menos de* for the capped forms. |
| the four questions (tabs) | Poder de compra futuro, Costo futuro, Del pasado a hoy, ¿Sigue el ritmo? | Quoted with «» in the FAQ and the privacy notice. No bare future (*comprará*, *costará*): a result is a scenario, so headings say *podría* and result sentences use the conditional (*comprarían*, *costaría*). |
| euro area | zona del euro | |
