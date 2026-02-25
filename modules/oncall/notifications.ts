export async function sendOnCallNotification(
  _tenantId: string,
  request: { id: string; requestType: string; status: string; student?: { fullName?: string } | null },
  type: "created" | "acknowledged" | "resolved"
) {
  const studentName = request.student?.fullName ?? "Unknown";
  console.log(
    `[OnCall] ${type.toUpperCase()} – requestId=${request.id} student=${studentName} type=${request.requestType} status=${request.status}`
  );
  // Future: send email via SendGrid or similar
}
