Fullstack Facial Recognition System — Face API, Firebase & v0.dev

 🧰 Stack Tecnológico

- Frontend: React (Vite), TailwindCSS, face-api.js
- Backend: Firebase Firestore (serverless, NoSQL)
- UI Builder: [v0.dev](https://v0.dev)
- Deploy: Vercel, v0.dev


 📊 Funcionalidades

- Detecção facial em tempo real via webcam.
- Estimativa de distância entre rosto e câmera com base no tamanho da bounding box.
- Persistência de dados de detecção no Firestore.
- Lógica de deduplicação temporal por rosto.
- Dashboard com métricas: total de pessoas, detecções recentes, tempo entre aparições, entre outras.


 🔢 Estrutura por Etapas

 ✅ Etapa 1 — Mock da Interface com v0.dev 

- Layout responsivo, construído no v0.dev.
- Espaço reservado para vídeo e dados.
- Indicadores numéricos (total de pessoas, frequência de aparição, etc).
- Campo com respostas técnicas solicitadas.

🔗 Deploy (v0.dev): [https://v0.dev/your-interface-link](https://v0.dev/your-interface-link)


 ✅ Etapa 2 — Integração com face-api.js (+20 pts)

- Captura de vídeo via webcam.
- Modelos pré-treinados carregados localmente (Tiny Face Detector).
- Bounding boxes desenhadas ao vivo.
- Estimativa de distância aproximada (ver Pergunta Técnica 1).

🔗 Deploy (Vercel): [https://your-vercel-link.vercel.app](https://your-vercel-link.vercel.app)

---

 ✅ Etapa 3 — Integração com Firebase 

- Dados de detecção persistidos em tempo real no Firestore.
- Prevenção de duplicidade por ID e intervalo de tempo.
- Histórico das detecções acessível via dashboard.



 📂 Instalação Local

 1. Clonar repositório

bash
git clone https://github.com/tiago10desenvolvedor/Teste-Fullstack-Face-API-Firebase-v0.dev-.git
cd Teste-Fullstack-Face-API-Firebase-v0.dev-

2.  Instale as Dependências
-npm install

3.  Configure o Firebase
Crie um projeto no Firebase Console
Ative o Firestore Database
Adicione um app web e copie as credenciais.
Crie um arquivo .env com o conteúdo abaixo:
VITE_API_KEY=YOUR_API_KEY
VITE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_PROJECT_ID=YOUR_PROJECT_ID
VITE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_APP_ID=YOUR_APP_ID

4. Baixe e Configure os Modelos da Face API
4.1 Crie a pasta:
bash
mkdir -p public/models
Baixe os arquivos a partir do repositório oficial:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights
Modelos obrigatórios:
tiny_face_detector_model-shard1
tiny_face_detector_model-weights_manifest.json
Cole todos os arquivos baixados na pasta: public/models/

5. Execute o Projeto Localmente

  *npm run dev*

