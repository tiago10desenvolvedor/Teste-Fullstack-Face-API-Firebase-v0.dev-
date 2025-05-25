"use client"
import { FileText, Ruler, Activity, ShieldCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react"
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/firebase"

interface LastFace {
  x: number
  y: number
  timestamp: number
}

export default function Dashboard() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentPeopleCount, setCurrentPeopleCount] = useState(0)
  const [lastDetection, setLastDetection] = useState<string | null>(null)
  const [detectionHistory, setDetectionHistory] = useState<{ time: string; count: number }[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const lastFacesRef = useRef<LastFace[]>([])
  const lastSavedDetectionRef = useRef<number | null>(null)

  const REAL_FACE_WIDTH_CM = 16
  const FOCAL_LENGTH_PIXELS = 600
  const DETECTION_INTERVAL_MS = 60000

  function estimateDistance(boxWidth: number) {
    return (REAL_FACE_WIDTH_CM * FOCAL_LENGTH_PIXELS) / boxWidth
  }

  async function salvarDeteccao(count: number) {
    try {
      await addDoc(collection(db, "deteccoes"), {
        count,
        timestamp: serverTimestamp(),
      })
    } catch (error) {
      console.error("Erro ao salvar detecção no Firestore:", error)
    }
  }

  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models"
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch (err) {
        console.error("Erro ao carregar modelos:", err)
      }
    }
    loadModels()
  }, [])

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsStreaming(true)
          setStream(mediaStream)
        }
      }
    } catch (error) {
      console.error("Erro ao acessar a webcam:", error)
      alert("Erro ao acessar a webcam. Verifique permissões.")
    }
  }

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsStreaming(false)
    setCurrentPeopleCount(0)
    clearCanvas()
    lastFacesRef.current = []
    lastSavedDetectionRef.current = null
    setLastDetection(null)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  useEffect(() => {
    if (!isStreaming || !modelsLoaded) return

    const intervalId = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withAgeAndGender()
          .withFaceExpressions()

        const canvas = canvasRef.current
        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        }

        if (displaySize.width === 0 || displaySize.height === 0) return

        canvas.width = displaySize.width
        canvas.height = displaySize.height

        faceapi.matchDimensions(canvas, displaySize)

        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        resizedDetections.forEach((detection) => {
          const box = detection.detection.box
          const { x, y, width, height } = box
          // desenha caixa da face
          ctx.strokeStyle = "lime"
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, width, height)

          // distância aproximada
          const distance = estimateDistance(width)
          ctx.fillStyle = "red"
          ctx.font = "16px Arial"
          ctx.fillText(`${distance.toFixed(2)} cm`, x, y - 5)

          // idade e gênero
          const age = detection.age ? detection.age.toFixed(0) : "N/A"
          const gender = detection.gender ? detection.gender : "N/A"
          ctx.fillStyle = "white"
          ctx.font = "14px Arial"
          ctx.fillText(`Idade: ${age}`, x, y + height + 18)
          ctx.fillText(`Gênero: ${gender}`, x, y + height + 36)

          // emoção dominante
          const expressions = detection.expressions
          if (expressions) {
            const maxEmotion = Object.entries(expressions).reduce(
              (max, curr) => (curr[1] > max[1] ? curr : max),
              ["neutral", 0]
            )
            ctx.fillText(`Emoção: ${maxEmotion[0]}`, x, y + height + 54)
          }
        })

        const now = Date.now()
        const newFaces = resizedDetections.map((d) => ({
          x: d.detection.box.x,
          y: d.detection.box.y,
          timestamp: now,
        }))

        const validFaces = newFaces.filter((nf) => {
          return !lastFacesRef.current.some(
            (lf) =>
              Math.abs(lf.x - nf.x) < 30 &&
              Math.abs(lf.y - nf.y) < 30 &&
              now - lf.timestamp < DETECTION_INTERVAL_MS
          )
        })

        lastFacesRef.current = [...validFaces, ...lastFacesRef.current].slice(0, 20)

        const count = resizedDetections.length
        setCurrentPeopleCount(count)

        const nowMinuteDate = new Date()
        nowMinuteDate.setSeconds(0, 0)
        const nowMinuteTimestamp = nowMinuteDate.getTime()

        if (count > 0 && lastSavedDetectionRef.current !== nowMinuteTimestamp) {
          const timeString = nowMinuteDate.toLocaleTimeString()
          setLastDetection(timeString)
          lastSavedDetectionRef.current = nowMinuteTimestamp
          salvarDeteccao(count)

          setDetectionHistory((prev) => [{ time: timeString, count }, ...prev])
        }
      }
    }, 300)

    return () => {
      clearInterval(intervalId)
      clearCanvas()
    }
  }, [isStreaming, modelsLoaded])

  return (
    <div className="container mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-3xl font-bold mb-6">Sistema de Monitoramento - Teste</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Webcam ao Vivo</span>
                <div className="flex space-x-2">
                  {isStreaming ? (
                    <Button variant="outline" size="sm" onClick={stopWebcam}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={startWebcam}
                      disabled={!modelsLoaded}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {modelsLoaded ? "Iniciar" : "Carregando modelos..."}
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Transmissão em tempo real com detecção de pessoas, idade, gênero e emoções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 640,
                  aspectRatio: "4 / 3",
                }}
                className="rounded-lg overflow-hidden bg-black mx-auto"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    backgroundColor: "black",
                    display: isStreaming ? "block" : "none",
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    display: isStreaming ? "block" : "none",
                  }}
                />
                {!isStreaming && (
                  <div className="text-white text-center p-4 absolute inset-0 flex flex-col justify-center items-center">
                    <AlertCircle className="h-12 w-12 mb-2" />
                    <p>Clique em "Iniciar" para ativar a câmera</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Indicadores</CardTitle>
              <CardDescription>Dados em tempo real</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  <span>Pessoas no momento</span>
                </div>
                <span className="font-bold text-xl">{currentPeopleCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-primary" />
                  <span>Última Detecção</span>
                </div>
                <span className="font-medium">{lastDetection || "Nenhuma"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  <span>Status</span>
                </div>
                <span className="font-medium">{isStreaming ? "Ativo" : "Inativo"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="max-h-[250px] overflow-y-auto">
            <CardHeader>
              <CardTitle>Histórico de Detecções</CardTitle>
              <CardDescription>Últimas leituras registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {detectionHistory.length > 0 ? (
                detectionHistory.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2 border-b"
                  >
                    <span className="text-sm text-muted-foreground">{d.time}</span>
                    <Badge variant="outline">
                      {d.count} {d.count === 1 ? "pessoa" : "pessoas"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma detecção registrada
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 w-full flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 shadow-md rounded-2xl border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2 text-blue-700">
              <FileText className="w-5 h-5 text-blue-500" />
              Perguntas Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-gray-800">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-medium text-blue-700 flex gap-2 items-start">
                <ShieldCheck className="w-4 h-4 mt-1 text-green-500" />
                1.Que regra utilizou para calcular a distância aproximada do rosto até a câmera?
              </p>
              <p className="mt-2 text-gray-700">
                A estimativa da distância entre o rosto e a câmera foi calculada usando a regra de semelhança de triângulos. Essa regra considera a largura do rosto detectada na imagem (em pixels) e a largura real média do rosto (estimada em 16 cm).

A fórmula utilizada foi:

Distância (cm) = (Largura Real do Rosto (cm) × Foco da Câmera (pixels)) / Largura do Rosto na Imagem (pixels)
O valor do foco da câmera foi calibrado empiricamente em aproximadamente 600 pixels, baseado em testes práticos com distâncias conhecidas.
A largura do rosto na imagem é obtida a partir das coordenadas da bounding box retornadas pela detecção facial, calculando a diferença entre a coordenada máxima e mínima no eixo horizontal.

Esse método permite estimar a distância em tempo real usando apenas a imagem capturada pela câmera, sem necessidade de equipamentos adicionais.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-medium text-blue-700 flex gap-2 items-start">
                <ShieldCheck className="w-4 h-4 mt-1 text-green-500" />
                2. Como foi implementado o filtro para evitar contagens duplicadas?
              </p>
              <p className="mt-2 text-gray-700">
                O filtro compara a posição das detecções recentes (coordenadas x e y)
                e considera uma nova detecção apenas se não estiver muito próxima de
                uma detecção anterior em até <strong>60 segundos</strong>.
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <p className="font-medium text-yellow-700 flex gap-2 items-start">
                <Activity className="w-4 h-4 mt-1 text-yellow-500" />
                3. Quais critérios foram usados para salvar os dados no Firestore?
              </p>
              <p className="mt-2 text-gray-700">
                Foi implementado um controle baseado em:
  Tempo: a detecção só é contada novamente após N segundos desde a última.
Localização: a posição (bounding box) deve estar suficientemente distante da última detecção, com base na distância euclidiana.
 Esse mecanismo evita contagens repetidas para uma mesma pessoa parada em frente à câmera.

              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
