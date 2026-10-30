-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('IMMOBILIER', 'AUTO', 'CONSOMMATION', 'PROFESSIONNEL', 'ETUDIANT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS', 'PENDING_DECISION', 'APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED', 'ACCEPTED_BY_CLIENT', 'REFUSED_BY_CLIENT', 'ACTIVE', 'CLOSED', 'DEFAULTED');

-- CreateTable
CREATE TABLE "credit_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "agency_id" TEXT,
    "credit_type" "CreditType" NOT NULL,
    "requested_amount" DECIMAL(15,2) NOT NULL,
    "requested_duration" INTEGER NOT NULL,
    "monthly_income" DECIMAL(15,2) NOT NULL,
    "existing_debts" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "credit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "comment" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_messages" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_requests_reference_key" ON "credit_requests"("reference");

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "credit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_messages" ADD CONSTRAINT "dossier_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "credit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
