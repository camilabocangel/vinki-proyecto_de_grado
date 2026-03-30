export const BEHAVIORAL_RUBRICS = `
Evalúa la respuesta conductual del candidato usando el método STAR.
Usa las mismas 5 métricas pero adaptadas al contexto behavioral:

1. **technicalCorrectness** (Situación y contexto)
   - 0: No describe ninguna situación
   - 1-2: Contexto vago o inventado
   - 3-4: Situación clara con algunos detalles faltantes
   - 5: Situación específica, real y bien contextualizada

2. **clarityOfExplanation** (Tarea y responsabilidad)
   - 0: No explica su rol
   - 1-2: Rol ambiguo, no queda claro qué le correspondía
   - 3-4: Explica su responsabilidad con claridad razonable
   - 5: Define con precisión su responsabilidad específica en la situación

3. **communication** (Comunicación y estructura STAR)
   - 0: Respuesta incoherente
   - 1-2: Desordenado, salta entre ideas sin estructura
   - 3-4: Estructura reconocible, buena comunicación general
   - 5: Sigue claramente el método STAR, comunicación profesional

4. **confidence** (Acción y toma de decisiones)
   - 0: No describe acciones concretas
   - 1-2: Acciones vagas o pasivas ("el equipo hizo...")
   - 3-4: Describe acciones propias con detalle razonable
   - 5: Acciones concretas, proactivas y bien justificadas

5. **problemSolving** (Resultado y aprendizaje)
   - 0: No menciona resultado
   - 1-2: Resultado vago sin métricas ni aprendizaje
   - 3-4: Resultado claro con algún aprendizaje
   - 5: Resultado medible, aprendizaje profundo y aplicable

Además, determina el nivel de madurez profesional:
- **detectedLevel**: "Junior" si la respuesta muestra poca experiencia en situaciones complejas, "Mid" si demuestra experiencia práctica con reflexión, "Senior" si muestra liderazgo, visión estratégica y aprendizaje sistémico.

También genera una recomendación de cómo respondería cada nivel:
- **juniorAnswer**: Ejemplo de respuesta behavioral de un Junior (situación simple, acciones básicas)
- **midAnswer**: Ejemplo de respuesta behavioral de un Mid (situación compleja, acciones colaborativas, resultado medible)
- **seniorAnswer**: Ejemplo de respuesta behavioral de un Senior (situación de alto impacto, liderazgo, aprendizaje organizacional)

Responde en JSON con el siguiente formato para CADA respuesta:
{
  "evaluations": [
    {
      "answerId": <number>,
      "technicalCorrectness": <0-5>,
      "clarityOfExplanation": <0-5>,
      "communication": <0-5>,
      "confidence": <0-5>,
      "problemSolving": <0-5>,
      "detectedLevel": "Junior" | "Mid" | "Senior",
      "feedbackText": "<párrafo con retroalimentación constructiva sobre la respuesta conductual en español>",
      "juniorAnswer": "<ejemplo de respuesta behavioral nivel Junior en español>",
      "midAnswer": "<ejemplo de respuesta behavioral nivel Mid en español>",
      "seniorAnswer": "<ejemplo de respuesta behavioral nivel Senior en español>"
    }
  ]
}
`;
