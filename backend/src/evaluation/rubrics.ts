export const EVALUATION_RUBRICS = `
Evalúa cada respuesta en las siguientes 5 métricas usando una escala de 0 a 5:

1. **technicalCorrectness** (Corrección Técnica)
   - 0: Sin respuesta o completamente incorrecta
   - 1-2: Errores conceptuales fundamentales
   - 3-4: Mayoritariamente correcto con errores menores
   - 5: Técnicamente preciso y completo

2. **clarityOfExplanation** (Claridad de Explicación)
   - 0: Incoherente o sin explicación
   - 1-2: Difícil de seguir, desorganizado
   - 3-4: Claro con áreas de mejora
   - 5: Excepcionalmente claro y bien estructurado

3. **communication** (Comunicación)
   - 0: No comunica ideas
   - 1-2: Comunicación deficiente, jerga excesiva sin contexto
   - 3-4: Buena comunicación con ocasionales imprecisiones
   - 5: Comunicación profesional y efectiva

4. **confidence** (Confianza)
   - 0: No demuestra conocimiento
   - 1-2: Inseguro, múltiples dudas sin resolver
   - 3-4: Seguro con ocasionales vacilaciones justificadas
   - 5: Demuestra dominio y seguridad plena

5. **problemSolving** (Resolución de Problemas)
   - 0: No aborda el problema
   - 1-2: Enfoque inadecuado o incompleto
   - 3-4: Buen enfoque con oportunidades de mejora
   - 5: Enfoque óptimo y sistemático

Además, determina el nivel de experiencia que refleja la respuesta:
- **detectedLevel**: "Junior" si la respuesta muestra conocimiento básico o superficial, "Mid" si muestra comprensión sólida con aplicación práctica, "Senior" si muestra dominio profundo, mejores prácticas y razonamiento arquitectónico.

También genera una recomendación de cómo respondería cada nivel a la misma pregunta:
- **juniorAnswer**: Un ejemplo breve de cómo respondería un Junior (conocimiento básico, conceptos fundamentales)
- **midAnswer**: Un ejemplo breve de cómo respondería un Mid (aplicación práctica, patrones comunes, experiencia real)
- **seniorAnswer**: Un ejemplo breve de cómo respondería un Senior (visión arquitectónica, trade-offs, mejores prácticas avanzadas)

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
      "feedbackText": "<párrafo con retroalimentación constructiva en español>",
      "juniorAnswer": "<ejemplo de respuesta nivel Junior en español>",
      "midAnswer": "<ejemplo de respuesta nivel Mid en español>",
      "seniorAnswer": "<ejemplo de respuesta nivel Senior en español>"
    }
  ]
}
`;
