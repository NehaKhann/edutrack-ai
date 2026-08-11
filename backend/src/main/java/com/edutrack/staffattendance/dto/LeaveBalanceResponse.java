package com.edutrack.staffattendance.dto;

import java.util.List;

public record LeaveBalanceResponse(List<Balance> balances) {
    public record Balance(String leaveType, int entitlement, int used, int remaining) {
    }
}
